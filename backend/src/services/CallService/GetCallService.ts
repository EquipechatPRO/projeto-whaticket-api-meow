import axios from "axios";
import CallHistory from "../../models/CallHistory"
import Company from "../../models/Company";
import User from "../../models/User";
import cacheLayer from "../../libs/cache";
import Whatsapp from "../../models/Whatsapp";
import Setting from "../../models/Setting";

const getWavoipCredentials = async (companyId: number) => {
    const settings = await Setting.findAll({
        where: { companyId },
        raw: true
    });

    console.log(`[Wavoip] Settings encontradas para companyId ${companyId}:`, settings.map(s => s.key));

    const urlSetting = settings.find(s => s.key === "wavoipUrl");
    const usernameSetting = settings.find(s => s.key === "wavoipUsername");
    const passwordSetting = settings.find(s => s.key === "wavoipPassword");

    const url = urlSetting?.value || process.env.WAVOIP_URL;
    const username = usernameSetting?.value || process.env.WAVOIP_USERNAME;
    const password = passwordSetting?.value || process.env.WAVOIP_PASSWORD;

    console.log(`[Wavoip] Credenciais - url: ${url || 'NÃO ENCONTRADA'}, username: ${username || 'NÃO ENCONTRADA'}, password: ${password ? '***' : 'NÃO ENCONTRADA'}`);

    return { url, username, password };
};

const loginWavoip = async (credentials: { url: string; username: string; password: string }) => {
    try {
        if (!credentials.url || !credentials.username || !credentials.password) {
            throw new Error("Credenciais Wavoip não configuradas. Configure URL, Email e Senha nas configurações do sistema.");
        }

        // Normalizar URL: remover trailing slash e garantir que não tem /login duplicado
        let baseUrl = credentials.url.replace(/\/+$/, "");
        if (baseUrl.endsWith("/login")) {
            baseUrl = baseUrl.slice(0, -6);
        }

        const loginUrl = `${baseUrl}/login`;
        console.log(`[Wavoip] Tentando login em: ${loginUrl}`);
        console.log(`[Wavoip] Username: ${credentials.username}`);

        const login: any = await axios.post(loginUrl, {
            "email": credentials.username,
            "password": credentials.password
        }, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });

        console.log(`[Wavoip] Resposta login status: ${login?.status}`);
        console.log(`[Wavoip] Resposta login data:`, JSON.stringify(login?.data));

        if (!login?.data?.result?.token) {
            // Tentar outros campos comuns de token
            const token = login?.data?.token || login?.data?.access_token || login?.data?.data?.token;
            if (token) {
                console.log(`[Wavoip] Token encontrado em campo alternativo`);
                return token;
            }
            const errMsg = login?.data?.message || login?.data?.error || "Resposta inválida do servidor Wavoip";
            console.error(`[Wavoip] Resposta completa sem token:`, JSON.stringify(login?.data));
            throw new Error(`Login Wavoip falhou: ${errMsg}`);
        }

        return login?.data?.result?.token;
    } catch (error: any) {
        const status = error?.response?.status;
        const responseData = error?.response?.data;
        const msg = error?.response?.data?.message || error?.message || String(error);
        console.error(`[Wavoip] Erro no login:`);
        console.error(`  - URL usada: ${credentials.url.replace(/\/+$/, "")}/login`);
        console.error(`  - Status HTTP: ${status || 'sem resposta (network error)'}`);
        console.error(`  - Mensagem: ${msg}`);
        if (responseData) {
            console.error(`  - Resposta do servidor:`, JSON.stringify(responseData));
        }
        if (status === 405) {
            console.error(`  - DICA 405: O servidor não aceita POST em /login. Verifique se a URL base está correta (ex: https://api.wavoip.com — sem /login no final)`);
        }
        throw new Error(`Wavoip login error (${status || 'network'}): ${msg}`);
    }
}

const getHistorical = async (body: { "user_id": number, "company_id": number }) => {

    try {
        const credentials = await getWavoipCredentials(body.company_id);

        if (!credentials.url || !credentials.username || !credentials.password) {
            return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
        }

        const chave = `loginWavoipToken:${body.company_id}`;
        let token = await cacheLayer.get(chave);

        if (!token) {
            console.log('[Wavoip] Fazendo login...');
            try {
                token = await loginWavoip(credentials);
                await cacheLayer.set(chave, token, "EX", 3600);
            } catch (loginErr: any) {
                const msg = loginErr?.message || String(loginErr);
                console.warn(`[Wavoip] Login falhou, retornando vazio: ${msg}`);
                return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
            }
        }

        // Helper: busca com retry automático em caso de 401/405 (token expirado)
        const axiosGetWithRetry = async (url: string) => {
            try {
                return await axios.get(url, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 401 || status === 405) {
                    console.log(`[Wavoip] Token expirado (${status}) ao chamar ${url}, renovando...`);
                    await cacheLayer.del(chave);
                    token = await loginWavoip(credentials);
                    await cacheLayer.set(chave, token, "EX", 3600);
                    return await axios.get(url, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                }
                throw err;
            }
        };

        let devices: any;
        try {
            devices = await axiosGetWithRetry(`${credentials.url}/devices/me`);
        } catch (devErr: any) {
            const status = devErr?.response?.status;
            const msg = devErr?.response?.data?.message || devErr?.message || String(devErr);
            console.error(`[Wavoip] Erro ao buscar devices: status=${status} msg=${msg}`);
            return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
        }

        const user = await User.findOne({
            raw: true,
            nest: true,
            include: [{
                model: Whatsapp,
                attributes: ['id', 'wavoip'],
            }],
            where: {
                id: body.user_id
            }
        });

        if (!user?.whatsapp?.wavoip) {
            return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
        }

        let devicesAll = [];

        for (const device of devices?.data?.result || []) {
            try {
                if (user?.whatsapp?.wavoip != device?.token) {
                    continue;
                }

                console.log('[Wavoip] device', device);

                const regs: any = await axiosGetWithRetry(`${credentials.url}/calls/devices/${device.id}`);

                if (!regs?.data?.result?.length) {
                    continue;
                }

                for (const reg of regs.data.result) {
                    devicesAll.push({ ...reg, token: device.token });
                }

            } catch (error: any) {
                const status = error?.response?.status;
                const msg = error?.response?.data?.message || error?.message || String(error);
                console.error(`[Wavoip] Erro no device ${device.id}: status=${status} msg=${msg}`);
                continue;
            }
        }

        if (devicesAll.length <= 0) {
            return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
        }

        const historicalDB: any = await CallHistory.findAll({
            raw: true,
            nest: true,
            include: [{
                model: User,
                attributes: ['id', 'name'],
            },
            {
                model: Company,
                attributes: ['id', 'name'],
            }],
            where: {
                company_id: body.company_id
            }
        });

        const resultFinal = [];
        const cache = [];

        let totalServed = 0;
        let totalReject = 0;
        let totalFinish = 0;
        let total = 0;

        for (const device of devicesAll) {
            let callSaveUrl = '';
            if (device?.duration) {
                callSaveUrl = `https://storage.wavoip.com/${device?.whatsapp_call_id}`;
            }

            if (device.direction == 'OUTCOMING') {
                const historicMatch = historicalDB.find(h =>
                    h.token_wavoip === device.token &&
                    Math.abs(new Date(h.createdAt).getTime() - new Date(device.created_date).getTime()) <= 1 * 60 * 1000
                );

                if (historicMatch && !cache.includes(historicMatch.id)) {
                    cache.push(historicMatch.id);
                    resultFinal.push({ ...historicMatch, devices: device, callSaveUrl });
                }
            }

            if (device.direction == 'INCOMING') {
                resultFinal.push({ devices: device, callSaveUrl, user: { id: '', name: '' }, company: { id: '', name: '' }, phone_to: device?.caller, createdAt: device?.created_date });
            }

            if (device?.duration) totalServed += 1;
            if (device?.status == "ENDED") totalFinish += 1;
            if (device?.status == "REJECTED") totalReject += 1;
            total += 1;
        }

        return { resultFinal, total, totalReject, totalServed, totalFinish };

    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || String(error);
        console.error('[getHistorical Wavoip] Erro geral:', msg);
        throw new Error(msg);
    }
}


export default getHistorical;