/**
 * House tokens for the DCCP world revision.
 * eFuse blue is taken from the house front-end pillar record (#2e7bff).
 * If that record is withdrawn, this token is UNKNOWN and the orb is not drawn.
 */
export const TOKENS = {
  background: "#07080c",
  foreground: "#f3efe6",
  orbs: {
    residual: { name: "Residual Law Finance", color: "#e8c36a" },
    edge: { name: "Edge Technologies", color: "#14b8a6" },
    research: { name: "Research", color: "#00FF9D" },
    dclm: { name: "DCLM", color: "#00F5D4" },
    unity: { name: "Unity", color: "#a855f7" },
    efuse: { name: "eFuse", color: "#2e7bff", source: "unified-front-end.html pillar 06" }
  },
  iris: {
    shell: "#a855f7",
    cores: ["#14b8a6", "#14b8a6"]
  }
};
