import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  decodeExport,
  getExportUrl,
  parseGdeltDate,
  parseGdeltExport,
} from "../server/utils/gdelt";

function row(overrides: Record<number, string> = {}) {
  const fields = Array.from({ length: 61 }, () => "");
  Object.assign(fields, {
    0: "123456",
    1: "20261028",
    6: "ACTOR A",
    12: "MIL",
    16: "ACTOR B",
    28: "19",
    31: "3",
    51: "4",
    52: "Kyiv, Ukraine",
    56: "50.45",
    57: "30.52",
    59: "20261028150000",
    60: "https://example.org/report",
    ...overrides,
  });
  return fields.join("\t");
}
describe("normalização do GDELT", () => {
  it("preserva local do evento, atores, fonte e datas distintas", () => {
    const [event] = parseGdeltExport(row({ 1: "20261027" }));
    expect(event).toMatchObject({
      id: "123456",
      coordinates: [30.52, 50.45],
      kind: "armed",
      region: "Europa",
      source: "example.org",
      actors: ["ACTOR A", "ACTOR B"],
      eventDate: "2026-10-27",
      reportedAt: "2026-10-28T15:00:00Z",
      demo: false,
    });
  });
  it("ignora linhas incompletas, outros códigos, coordenadas inválidas e URLs executáveis", () => {
    for (const input of [
      "broken",
      row({ 28: "01" }),
      row({ 56: "" }),
      row({ 56: "NaN" }),
      row({ 56: "91" }),
      row({ 57: "181" }),
      row({ 51: "0" }),
      row({ 60: "javascript:alert(1)" }),
      row({ 59: "invalid" }),
    ])
      expect(parseGdeltExport(input)).toEqual([]);
  });
  it("aceita coordenadas zero, classifica coerção e elimina IDs repetidos", () => {
    const input = row({ 56: "0", 57: "0", 28: "17" });
    expect(parseGdeltExport(`${input}\n${input}`)).toHaveLength(1);
    expect(parseGdeltExport(input)[0]?.kind).toBe("tension");
  });
  it("agrupa extrações do mesmo artigo, local, tipo e data preservando atores e vínculo militar", () => {
    const parsed = parseGdeltExport(
      [row({ 12: "" }), row({ 0: "123457", 6: "ACTOR C" })].join("\n"),
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.actors).toEqual(["ACTOR A", "ACTOR B", "ACTOR C"]);
    expect(parsed[0]?.military).toBe(true);
  });
  it("não permite que o manifesto redirecione a consulta a outro domínio", () => {
    expect(() =>
      getExportUrl("https://evil.example/20261028150000.export.CSV.zip"),
    ).toThrow();
    expect(
      getExportUrl(
        "100 hash http://data.gdeltproject.org/gdeltv2/20261028150000.export.CSV.zip",
      ).url,
    ).toBe(
      "https://data.gdeltproject.org/gdeltv2/20261028150000.export.CSV.zip",
    );
  });
  it("rejeita timestamps impossíveis", () => {
    expect(parseGdeltDate("20260230120000")).toBeNull();
    expect(parseGdeltDate("20261028150000")).toBe("2026-10-28T15:00:00Z");
  });
  it("extrai apenas o CSV de eventos do arquivo zip", () => {
    const zip = zipSync({
      "20261028150000.export.CSV": strToU8(row()),
      "other.txt": strToU8("ignore"),
    });
    expect(parseGdeltExport(decodeExport(zip))).toHaveLength(1);
    expect(() =>
      decodeExport(zipSync({ "other.txt": strToU8("ignore") })),
    ).toThrow();
  });
});
