import { Op } from "sequelize";
import QuickMessage from "../../models/QuickMessage";
import Company from "../../models/Company";
import QuickMessageComponent from "../../models/QuickMessageComponent";

type Params = {
  companyId: string;
  userId: string;
  isOficial: string;
  whatsappId?: string;
};

const FindService = async ({ companyId, userId, isOficial, whatsappId }: Params): Promise<QuickMessage[]> => {

  const orConditions: any[] = [{ visao: true }];
  if (userId) {
    orConditions.push({ userId });
  }

  // Determinar filtro de isOficial:
  // - Se isOficial === "true": retorna APENAS templates oficiais
  // - Caso contrário: retorna AMBOS (oficiais + não-oficiais) para que
  //   os templates da API Oficial sempre apareçam nas respostas rápidas
  let isOficialFilter: any;
  if (isOficial === "true") {
    isOficialFilter = true;
  } else {
    isOficialFilter = { [Op.or]: [true, false] };
  }

  const notes: QuickMessage[] = await QuickMessage.findAll({
    where: {
      companyId,
      [Op.or]: orConditions,
      isOficial: isOficialFilter
    },
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["id", "name"]
      },
      {
        model: QuickMessageComponent,
        as: "components",
        attributes: ["id", "type", "text", "quickMessageId", "buttons", "format", "example"],
        order: [["quickMessageId", "ASC"], ["id", "ASC"]]
      }
    ],
  });

  return notes as QuickMessage[];
};

export default FindService;
