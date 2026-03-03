/**
 * Compatibility shim: exposes `@itsukichan/baileys` using the old
 * `@whiskeysockets/baileys` import shape used across this codebase.
 *
 * Why explicit exports?
 * - The fork is shipped as CommonJS and some TS setups can lose named exports.
 * - We export the symbols used by this repo as `any` to keep compilation stable
 *   across Baileys forks.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path: any = require("path");

// Tenta carregar o Baileys de formas diferentes dependendo do ambiente.
// - Preferimos o fork `@itsukichan/baileys` (compatível com interactiveButtons/nativeFlow usados no projeto)
// - Se não existir, usamos `@whiskeysockets/baileys` como fallback.
// - Caminhos absolutos evitam cair no moduleAlias em cenários específicos.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tryRequire = (id: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(id);
  } catch {
    return undefined;
  }
};

const baileys: any =
  tryRequire("@itsukichan/baileys") ??
  tryRequire(path.join(process.cwd(), "node_modules", "@itsukichan", "baileys")) ??
  tryRequire(path.join(__dirname, "..", "..", "node_modules", "@itsukichan", "baileys")) ??
  tryRequire("@whiskeysockets/baileys") ??
  tryRequire(path.join(process.cwd(), "node_modules", "@whiskeysockets", "baileys")) ??
  tryRequire(path.join(__dirname, "..", "..", "node_modules", "@whiskeysockets", "baileys"));

if (!baileys) {
  throw new Error(
    "Baileys não encontrado. Instale @itsukichan/baileys (recomendado) ou @whiskeysockets/baileys no backend."
  );
}

// Default export (makeWASocket in most Baileys forks)
const defaultExport: any = baileys?.default ?? baileys;
export default defaultExport;

// --- Core runtime exports ---
export const makeWASocket: any = baileys.makeWASocket ?? defaultExport;

// proto needs to work both as a value AND as a namespace (proto.IWebMessageInfo etc.)
export const proto: any = baileys.proto;
// Declare proto as a namespace so `proto.X` type references compile
export declare namespace proto {
  type IWebMessageInfo = any;
  type WebMessageInfo = any;
  type IUserReceipt = any;
  type Message = any;
  namespace Message {
    type AppStateSyncKeyData = any;
  }
}

export const initAuthCreds: any = baileys.initAuthCreds;
export const makeCacheableSignalKeyStore: any = baileys.makeCacheableSignalKeyStore;

export const delay: any = baileys.delay;
export const generateWAMessageFromContent: any = baileys.generateWAMessageFromContent;
export const downloadMediaMessage: any = baileys.downloadMediaMessage;
export const extractMessageContent: any = baileys.extractMessageContent;
export const getContentType: any = baileys.getContentType;

export const jidNormalizedUser: any = baileys.jidNormalizedUser;
export const isJidBroadcast: any = baileys.isJidBroadcast;
export const isJidGroup: any = baileys.isJidGroup;
export const isJidStatusBroadcast: any = baileys.isJidStatusBroadcast;

export const Browsers: any = baileys.Browsers;
export const DisconnectReason: any = baileys.DisconnectReason;

// Some forks expose this with different naming
export const isJidNewsletter: any =
  baileys.isJidNewsletter ?? baileys.isJidNewsLetter ?? baileys.isJidNewsLetter;

// BufferJSON helper (used to serialize sessions)
export const BufferJSON = {
  replacer: (_key: string, value: any) => {
    if (value?.type === "Buffer" && Array.isArray(value?.data)) {
      return { type: "Buffer", data: Buffer.from(value.data).toString("base64") };
    }
    if (Buffer.isBuffer(value)) {
      return { type: "Buffer", data: value.toString("base64") };
    }
    return value;
  },
  reviver: (_key: string, value: any) => {
    if (value?.type === "Buffer" && typeof value?.data === "string") {
      return Buffer.from(value.data, "base64");
    }
    return value;
  }
};

// makeInMemoryStore — may live in different paths depending on the fork
const _resolveInMemoryStore = (): any => {
  if (baileys.makeInMemoryStore) return baileys.makeInMemoryStore;

  const subPaths = [
    "lib/Store/make-in-memory-store",
    "lib/Store/makeInMemoryStore",
    "Store/make-in-memory-store",
  ];
  const packages = ["@itsukichan/baileys", "@whiskeysockets/baileys"];
  for (const pkg of packages) {
    for (const sub of subPaths) {
      try {
        const mod = require(`${pkg}/${sub}`);
        const fn = mod?.default ?? mod?.makeInMemoryStore ?? mod;
        if (typeof fn === "function") return fn;
      } catch {}
    }
    // Also try absolute path
    for (const sub of subPaths) {
      try {
        const mod = require(path.join(process.cwd(), "node_modules", ...pkg.split("/"), sub));
        const fn = mod?.default ?? mod?.makeInMemoryStore ?? mod;
        if (typeof fn === "function") return fn;
      } catch {}
    }
  }

  // Stub: retorna um store "noop" que não faz nada mas não quebra
  return (_opts?: any) => ({
    bind: (_ev: any) => {},
    contacts: {},
    chats: { all: () => [] },
    messages: {},
    loadMessages: async () => [],
    loadMessage: async () => undefined,
    toJSON: () => ({}),
    fromJSON: () => {},
    readFromFile: () => {},
    writeToFile: () => {},
  });
};

export const makeInMemoryStore: any = _resolveInMemoryStore();

// --- Types (and dummy runtime bindings for legacy non-`import type` usage) ---
export type WASocket = any;
export const WASocket: any = baileys.WASocket;

export type BinaryNode = any;
export const BinaryNode: any = baileys.BinaryNode;

export type BaileysEventEmitter = any;
export const BaileysEventEmitter: any = baileys.BaileysEventEmitter;

export type Chat = any;
export const Chat: any = baileys.Chat;

export type ConnectionState = any;
export const ConnectionState: any = baileys.ConnectionState;

export type Contact = any;
export const Contact: any = baileys.Contact;

export type GroupMetadata = any;
export const GroupMetadata: any = baileys.GroupMetadata;

export type GroupParticipant = any;
export const GroupParticipant: any = baileys.GroupParticipant;

export type PresenceData = any;
export const PresenceData: any = baileys.PresenceData;

export type WAMessage = any;
export const WAMessage: any = baileys.WAMessage;

export type WAMessageContent = any;
export const WAMessageContent: any = baileys.WAMessageContent;

export type AnyMessageContent = any;
export const AnyMessageContent: any = baileys.AnyMessageContent;

export type WAMessageCursor = any;
export const WAMessageCursor: any = baileys.WAMessageCursor;

export type WAMessageKey = any;
export const WAMessageKey: any = baileys.WAMessageKey;

export type WAMessageStubType = any;
export const WAMessageStubType: any = baileys.WAMessageStubType;

export type WAMessageUpdate = any;
export const WAMessageUpdate: any = baileys.WAMessageUpdate;

export type WAPresence = any;
export const WAPresence: any = baileys.WAPresence;

export type MessageUpsertType = any;
export const MessageUpsertType: any = baileys.MessageUpsertType;

export type MediaType = any;
export const MediaType: any = baileys.MediaType;

export type AuthenticationCreds = any;
export const AuthenticationCreds: any = baileys.AuthenticationCreds;

export type AuthenticationState = any;
export const AuthenticationState: any = baileys.AuthenticationState;

export type SignalDataTypeMap = any;
export const SignalDataTypeMap: any = baileys.SignalDataTypeMap;
