export interface DiscordCapability {
  getColorRoles(guildId: string): Promise<Array<{ id: string; name: string; hexColor: string }>>;
  getMemberColor(guildId: string, memberId: string): Promise<string | null>;
  setMemberColor(guildId: string, memberId: string, roleId: string): Promise<void>;
}

export function makeFakeDiscord(opts: {
  colorRoles?: Array<{ id: string; name: string; hexColor: string }>;
  failOnSet?: boolean;
} = {}): DiscordCapability {
  const colorRoles = opts.colorRoles ?? [];
  const memberColor = new Map<string, string>();   // key `${guildId}:${memberId}` -> roleId
  return {
    async getColorRoles() { return colorRoles; },
    async getMemberColor(g, m) { return memberColor.get(`${g}:${m}`) ?? null; },
    async setMemberColor(g, m, roleId) {
      if (opts.failOnSet) throw new Error('Missing Permissions: role hierarchy');
      memberColor.set(`${g}:${m}`, roleId);
    },
  };
}
