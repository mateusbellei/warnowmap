import { describe, expect, it } from "vitest";
import {
  assessEvent,
  explicitStateLink,
  selectEditorial,
} from "../server/utils/editorial";
import { enrichContext, decodeGkg } from "../server/utils/gkg";
import { parseGdeltExport } from "../server/utils/gdelt";
import { zipSync, strToU8 } from "fflate";
import { demoEvents } from "../server/data/demo";
import type { ConflictEvent } from "../shared/types/conflict";

function event(overrides: Partial<ConflictEvent> = {}): ConflictEvent {
  return {
    ...demoEvents[0]!,
    demo: false,
    sourceUrl: "https://example.org/airstrike",
    actionCode: "195",
    participants: [{ name: "ARMED FORCES", country: null, roles: ["MIL"] }],
    articleContext: {
      themes: ["ARMEDCONFLICT"],
      headline: "Russian troops launch airstrikes in Ukraine",
    },
    ...overrides,
  };
}
function gkg(url: string, themes: string) {
  const row = Array(27).fill("");
  row[4] = url;
  row[7] = themes;
  row[26] =
    "<PAGE_TITLE>Troops launch airstrikes as ceasefire talks stall</PAGE_TITLE>";
  return row.join("\t");
}
describe("triagem para mapa de conflitos", () => {
  it("reproduz e exclui AMSTERDAM/BRAZIL do caso judicial mostrado no print", () => {
    const row = Array(61).fill("");
    Object.assign(row, {
      0: "1330384491",
      1: "20261029",
      5: "NLD",
      6: "AMSTERDAM",
      7: "NLD",
      15: "BRA",
      16: "BRAZIL",
      17: "BRA",
      26: "180",
      28: "18",
      51: "1",
      52: "Brazil",
      56: "-10",
      57: "-55",
      59: "20261029001500",
      60: "https://nltimes.nl/2026/10/28/appeals-court-reduces-sentence-diemen-abortion-murder-14-years-psych-treatment",
    });
    const parsed = parseGdeltExport(row.join("\t"))[0]!;
    expect(parsed.countryPair).toBe("BRA:NLD");
    expect(parsed.stateLinked).toBe(false);
    expect(parsed.locationPrecision).toBe("country");
    expect(
      selectEditorial(
        enrichContext(
          [parsed],
          gkg(
            parsed.sourceUrl,
            "TRIAL;KILL;WB_2432_FRAGILITY_CONFLICT_AND_VIOLENCE;",
          ),
        ),
      ).events,
    ).toEqual([]);
  });
  it("não transforma capital, nacionalidade ou cargo judicial em ação militar/estatal", () => {
    expect(
      explicitStateLink(
        event({
          participants: [{ name: "AMSTERDAM", country: null, roles: [] }],
        }),
      ),
    ).toBe(false);
    expect(
      assessEvent(
        event({
          actionCode: "190",
          participants: [
            { name: "APPEALS COURT", country: null, roles: ["JUD"] },
          ],
        }),
      ).accepted,
    ).toBe(false);
  });
  it("preserva ataques com papel armado e contexto explícito, inclusive conflitos internos", () => {
    expect(assessEvent(event({ countryPair: null }))).toMatchObject({
      accepted: true,
      basis: "context",
    });
    expect(
      assessEvent(
        event({
          participants: [
            { name: "REBEL GROUP", country: null, roles: ["REB"] },
          ],
        }),
      ).accepted,
    ).toBe(true);
  });
  it("não usa códigos genéricos ou temas amplos de crime como prova de conflito", () => {
    expect(assessEvent(event({ actionCode: "180" })).accepted).toBe(false);
    expect(
      assessEvent(
        event({
          articleContext: {
            themes: [
              "KILL",
              "TRIAL",
              "UNGP_CRIME_VIOLENCE",
              "WB_2433_CONFLICT_AND_VIOLENCE",
            ],
          },
        }),
      ).accepted,
    ).toBe(false);
  });
  it("exclui visitas, consultas, elogios e comércio mesmo em matéria com tema militar", () => {
    for (const actionCode of [
      "04",
      "040",
      "042",
      "043",
      "050",
      "051",
      "061",
      "0311",
    ])
      expect(
        assessEvent(
          event({
            actionCode,
            participants: [
              { name: "PRESIDENT", country: null, roles: ["GOV"] },
            ],
          }),
        ).accepted,
      ).toBe(false);
  });
  it("admite mediação/cessar-fogo com contexto, não simples diplomacia sem esse vínculo", () => {
    for (const actionCode of ["045", "046", "0871"])
      expect(
        assessEvent(
          event({
            actionCode,
            kind: "diplomacy",
            articleContext: {
              themes: ["ARMEDCONFLICT"],
              headline: "Russia and Ukraine hold ceasefire talks",
            },
          }),
        ).accepted,
      ).toBe(true);
    expect(
      assessEvent(event({ actionCode: "045", articleContext: undefined }))
        .accepted,
    ).toBe(false);
  });
  it("exige sinal específico, governo e tema de sanções para economia", () => {
    const sanction = event({
      kind: "tension",
      actionCode: "163",
      participants: [{ name: "GOVERNMENT", country: null, roles: ["GOV"] }],
      articleContext: {
        themes: ["SANCTIONS"],
        headline: "Russia announces sanctions on Ukraine",
      },
    });
    expect(assessEvent(sanction).accepted).toBe(true);
    expect(
      assessEvent({
        ...sanction,
        participants: [{ name: "CITY", country: null, roles: [] }],
      }).accepted,
    ).toBe(false);
    expect(
      assessEvent({ ...sanction, articleContext: undefined }).accepted,
    ).toBe(false);
  });
  it("na falta de manchete e contexto não publica mesmo uma ação militar específica", () => {
    expect(assessEvent(event({ articleContext: undefined }))).toMatchObject({
      accepted: false,
    });
    expect(
      assessEvent(event({ articleContext: undefined, actionCode: "190" }))
        .accepted,
    ).toBe(false);
    expect(
      assessEvent(event({ articleContext: undefined, actionCode: "130" }))
        .accepted,
    ).toBe(false);
  });
  it("não aceita registros legados sem os papéis preservados nem reaproveita seleção antiga", () => {
    const legacy = event({
      participants: undefined,
      selection: { basis: "context", reasons: ["regra anterior"] },
    });
    const result = selectEditorial([legacy, event()]);
    expect(result.events).toHaveLength(1);
    expect(result.quality).toMatchObject({
      evaluated: 2,
      selected: 1,
      rejected: 1,
      withContext: 1,
    });
  });
});
describe("contexto por artigo GKG", () => {
  it("associa pela URL exata; mesmo país ou links citados não transferem temas", () => {
    const input = event();
    const enriched = enrichContext(
      [input],
      gkg("https://example.org/other", "ARMEDCONFLICT;"),
    );
    expect(enriched[0]?.articleContext).toBeUndefined();
    expect(
      enrichContext([input], gkg(input.sourceUrl, "TRIAL;"))[0]?.articleContext
        ?.themes,
    ).toEqual(["TRIAL"]);
  });
  it("preserva query strings, ignora fragmentos e elimina temas repetidos", () => {
    const input = event({ sourceUrl: "https://example.org/article?id=1#top" });
    const result = enrichContext(
      [input],
      gkg("https://example.org/article?id=2", "ARMEDCONFLICT;") +
        "\n" +
        gkg("https://example.org/article?id=1", "TRIAL;TRIAL;"),
    );
    expect(result[0]?.articleContext?.themes).toEqual(["TRIAL"]);
  });
  it("extrai somente GKG e rejeita ZIP de outro tipo", () => {
    const csv = gkg("https://example.org/story", "ARMEDCONFLICT;");
    expect(decodeGkg(zipSync({ "batch.gkg.csv": strToU8(csv) }))).toBe(csv);
    expect(() => decodeGkg(zipSync({ "other.csv": strToU8(csv) }))).toThrow();
  });
});
