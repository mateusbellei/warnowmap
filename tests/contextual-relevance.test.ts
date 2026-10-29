import { describe, expect, it } from "vitest";
import { cleanHeadline } from "../server/utils/headline";
import { headlineCountries } from "../server/utils/headline-countries";
import { articleTopic } from "../server/utils/news-topics";
import { selectEditorial } from "../server/utils/editorial";
import { newsFromGkg } from "../server/utils/gkg";
import { demoEvents } from "../server/data/demo";
const themes = ["ARMEDCONFLICT", "MILITARY"];
const saudi =
  "Saudi Airstrikes on Yemen's Al-Jawf Leave 13 Martyred, 16 Injured";
const source = "https://www.islamicinvitationturkey.com/saudi-airstrikes/";
function cached(title: string, url = "https://example.org/story") {
  return {
    ...demoEvents[0]!,
    demo: false,
    title,
    sourceUrl: url,
    sourceType: "article" as const,
    countryBasis: "headline" as const,
    locationPrecision: "country" as const,
    articleContext: { headline: title, themes },
    countries: headlineCountries(title),
  };
}
describe("contexto operacional e manchetes editoriais", () => {
  it.each([
    "U15 World Cup 2026: Future Eagles edge Rwanda to set up Chile clash - Blueprint Newspapers Limited",
    "Sununu and Pappas clash in final debate of U.S. Senate race",
    "Sununu and Pappas debate Russian missile strikes in Senate race",
    "Rwandan genocide: Eric Nshimiye convicted in US for lying about role in the killings",
    "Rwandan genocide suspect on trial in US court",
    "UK and France clash over budget negotiations",
    "New football offensive as Chile clashes with Rwanda",
  ])("recusa narrativa não operacional: %s", (title) => {
    expect(articleTopic(title, themes)).toBeNull();
    expect(selectEditorial([cached(title)]).events).toEqual([]);
  });
  it.each([
    "Russian drones attack Ukraine",
    "Pakistan-Afghanistan border clashes leave dead and injured on both sides",
    "Heavy fighting, airstrikes sweep multiple fronts across Yemen",
    "Russian army launches offensive in Ukraine",
    "Russian missile attack hits football stadium in Ukraine",
  ])("preserva ação militar explícita: %s", (title) =>
    expect(articleTopic(title, themes)?.kind).toBe("armed"),
  );
  it("classifica expulsão diplomática sem converter clash em combate", () => {
    const title = "US Expels Cuban Diplomat After Fiery UN Clash";
    expect(articleTopic(title, themes)?.kind).toBe("tension");
    expect(selectEditorial([cached(title)]).events[0]?.kind).toBe("tension");
    expect(
      articleTopic("Court orders Israel to observe ceasefire", themes)?.kind,
    ).toBe("diplomacy");
  });
  it("remove somente assinatura reconhecida do veículo preservando pontuação e original", () => {
    expect(cleanHeadline(saudi + " - Islamic Invitation Turkey", source)).toBe(
      saudi,
    );
    expect(
      cleanHeadline(
        "Chile - Rwanda clash - Blueprint Newspapers Limited",
        "https://blueprint.ng/story",
      ),
    ).toBe("Chile - Rwanda clash");
    expect(
      cleanHeadline(
        "Arab News | Iran peace talks",
        "https://arabnews.com/story",
      ),
    ).toBe("Iran peace talks");
    expect(cleanHeadline("Iran - Turkey", "https://example.org/story")).toBe(
      "Iran - Turkey",
    );
  });
  it("corrige países e título de artigo antigo sem perder o ponto de referência válido", () => {
    const title = saudi + " - Islamic Invitation Turkey";
    const event = {
      ...cached(title, source),
      location: "Iêmen · referência de país na manchete",
      countries: [
        { code: "YEM", name: "Iêmen" },
        { code: "TUR", name: "Turquia" },
      ],
    };
    const [result] = selectEditorial([event]).events;
    expect(result?.title).toBe(saudi);
    expect(result?.countries.map((c) => c.code)).toEqual(["SAU", "YEM"]);
    expect(result?.articleContext?.originalHeadline).toBe(title);
    expect(event.title).toBe(title);
    expect(
      selectEditorial([
        { ...event, location: "Turquia · referência de país na manchete" },
      ]).events,
    ).toEqual([]);
  });
  it("normaliza a manchete antes de admitir uma nova notícia GKG", () => {
    const fields = Array(27).fill("");
    Object.assign(fields, {
      0: "id",
      1: "20261029001500",
      4: source,
      7: themes.join(";"),
      9: "1#Yemen#YM#YM#15#48#YM",
      26: `<PAGE_TITLE>${saudi} - Islamic Invitation Turkey</PAGE_TITLE>`,
    });
    const [result] = newsFromGkg(
      fields.join("\t"),
      Date.parse("2026-10-29T00:30:00Z"),
    );
    expect(result?.title).toBe(saudi);
    expect(result?.countries.map((c) => c.code)).toEqual(["SAU", "YEM"]);
  });
  it("distingue as duas repúblicas do Congo e reconhece siglas explícitas", () => {
    expect(
      headlineCountries(
        "US sanctions Rwanda's defence ministry over DR Congo conflict",
      ).map((c) => c.code),
    ).toEqual(["USA", "RWA", "COD"]);
    expect(headlineCountries("DRC conflict").map((c) => c.code)).toEqual([
      "COD",
    ]);
    expect(
      headlineCountries("Democratic Republic of the Congo conflict").map(
        (c) => c.code,
      ),
    ).toEqual(["COD"]);
    expect(headlineCountries("Congo clashes")).toEqual([]);
    expect(
      headlineCountries(
        "Republic of Congo and Democratic Republic of Congo",
      ).map((c) => c.code),
    ).toEqual(["COG", "COD"]);
    const title =
      "US sanctions Rwanda's defence ministry over DR Congo conflict";
    const old = {
      ...cached(title),
      articleContext: { headline: title, themes: [...themes, "SANCTIONS"] },
      kind: "tension" as const,
      countries: [
        { code: "USA", name: "Estados Unidos" },
        { code: "RWA", name: "Ruanda" },
        { code: "COG", name: "República do Congo" },
      ],
    };
    expect(
      selectEditorial([old]).events[0]?.countries.map((c) => c.code),
    ).toEqual(["USA", "RWA", "COD"]);
  });
});
