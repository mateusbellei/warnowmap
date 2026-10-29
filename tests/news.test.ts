import { describe, expect, it } from "vitest";
import {
  headlineCountries,
  countryReference,
} from "../server/utils/headline-countries";
import { articleTopic } from "../server/utils/news-topics";
import { newsFromGkg, pageHeadline } from "../server/utils/gkg";
import { selectEditorial } from "../server/utils/editorial";
const now = Date.parse("2026-10-29T00:15:00Z");
function row(
  title: string,
  options: {
    themes?: string;
    locations?: string;
    published?: string;
    url?: string;
  } = {},
) {
  const fields = Array(27).fill("");
  Object.assign(fields, {
    0: "20261029001500-1",
    1: "20261029001500",
    4: options.url ?? "https://example.org/story",
    7: options.themes ?? "ARMEDCONFLICT;MILITARY;",
    9: options.locations ?? "1#Russia#RS#RS#60#100#RS;1#Ukraine#UP#UP#49#32#UP",
    26: `<PAGE_TITLE>${title}</PAGE_TITLE>${options.published === "" ? "" : `<PAGE_PRECISEPUBTIMESTAMP>${options.published ?? "20261029000500"}</PAGE_PRECISEPUBTIMESTAMP>`}`,
  });
  return fields.join("\t");
}
describe("notícia como unidade principal", () => {
  it("não confunde negociação de coalizão eleitoral com diplomacia de conflito por temas do contexto", () => {
    expect(
      articleTopic(
        "Benjamin Netanyahu edges ahead in Israeli general election - but faces weeks of negotiations in bid to hang onto power",
        ["ARMEDCONFLICT", "MILITARY"],
      ),
    ).toBeNull();
    expect(
      articleTopic("Israel and Iran resume peace talks after election", [
        "ARMEDCONFLICT",
      ])?.kind,
    ).toBe("diplomacy");
  });
  it("não converte ameaças comerciais ou metáforas eleitorais em incidentes militares", () => {
    for (const title of [
      "CPKC head calls out alleged threats to shippers who oppose major U.S. rail merger",
      "Michael Douglas Tells British Audience 'I'm Hoping for a Massacre' for Trump in Midterms",
    ])
      expect(articleTopic(title, ["ARMEDCONFLICT", "MILITARY"])).toBeNull();
    expect(
      articleTopic("Iran threatens missile strikes on US bases", ["MILITARY"])
        ?.kind,
    ).toBe("tension");
  });
  it("publica a manchete real sem inventar código CAMEO, atores ou guerra entre países", () => {
    const [news] = newsFromGkg(
      row("Russian drones attack Ukraine in renewed offensive"),
      now,
    );
    expect(news).toMatchObject({
      sourceType: "article",
      countryBasis: "headline",
      dateBasis: "publication",
      kind: "armed",
      actionCode: "",
      actors: [],
      stateLinked: false,
      locationPrecision: "country",
    });
    expect(news?.countries.map((country) => country.code)).toEqual([
      "RUS",
      "UKR",
    ]);
    expect(selectEditorial([news!]).events).toHaveLength(1);
  });
  it("classifica lançamento de míssil como tensão e não transforma afiliações incidentais em beligerantes", () => {
    const [news] = newsFromGkg(
      row(
        "China Gave Australia Just Two Hours' Notice of Pacific Missile Launch, Senate Hears",
        {
          locations:
            "1#China#CH#CH#35#105#CH;1#Australia#AS#AS#-25#135#AS;1#Fiji#FJ#FJ#-18#178#FJ",
        },
      ),
      now,
    );
    expect(news?.kind).toBe("tension");
    expect(news?.countries.map((country) => country.code)).toEqual([
      "CHN",
      "AUS",
    ]);
    expect(news?.countryPair).toBe("AUS:CHN");
    const cached = { ...news!, countries: [news!.countries[1]!] };
    expect(
      selectEditorial([cached]).events[0]?.countries.map(
        (country) => country.code,
      ),
    ).toEqual(["CHN", "AUS"]);
  });
  it("descarta crimes locais, visitas rotineiras e obituários mesmo quando temas amplos citam conflito", () => {
    for (const title of [
      "Appeals court reduces sentence in Diemen abortion murder: 14 years, no psych treatment",
      "Netherlands and Brazil host meeting on tourism",
      "Federal judge who handled Trump, Maduro and 9/11 cases dies at 92",
    ])
      expect(newsFromGkg(row(title), now)).toEqual([]);
  });
  it("não posiciona notícia sem uma referência do país citado na manchete", () => {
    expect(
      newsFromGkg(
        row("Russian drones attack Ukraine", {
          locations: "1#Brazil#BR#BR#-10#-55#BR",
        }),
        now,
      ),
    ).toEqual([]);
    expect(
      countryReference(
        "4#Paris#FR#FR11#48.85#2.35#123",
        headlineCountries("France"),
      ),
    ).toBeNull();
  });
  it("exclui publicação antiga ou sem data, e deduplica a mesma URL", () => {
    const title = "Russian drones attack Ukraine";
    expect(
      newsFromGkg(row(title, { published: "20261020000500" }), now),
    ).toEqual([]);
    expect(newsFromGkg(row(title, { published: "" }), now)[0]?.dateBasis).toBe(
      "indexed",
    );
    const [news] = newsFromGkg(row(title), now);
    expect(
      selectEditorial([news!, { ...news!, id: "other-id" }]).events,
    ).toHaveLength(1);
  });
  it("não usa apenas palavras de guerra sem um tema compatível do mesmo artigo", () => {
    for (const title of [
      "Fiji Defence Minister calls on nuclear test nations to help fund veterans' care",
      "AU accredits Nigeria's counter-terrorism centre for West Africa",
    ])
      expect(articleTopic(title, ["ARMEDCONFLICT", "MILITARY"])).toBeNull();
    expect(
      articleTopic("Russian drones attack Ukraine", [
        "TRIAL",
        "WB_2433_CONFLICT_AND_VIOLENCE",
      ]),
    ).toBeNull();
    expect(
      articleTopic("Iran ceasefire talks resume", ["ARMEDCONFLICT"])?.kind,
    ).toBe("diplomacy");
  });
  it("não transforma julgamentos ou pesquisas de apoio em violência atual, inclusive no acervo", () => {
    for (const title of [
      "Rwanda: Genocide - U.S. Court Convicts Rwandan Man Over False Testimony",
      "Ukraine Invasion Day 1,708: 80% of Ukrainians support hitting RU oil refineries",
      "Survey shows Ukrainians support strikes on Russian oil refineries",
    ]) {
      expect(articleTopic(title, ["ARMEDCONFLICT", "MILITARY"])).toBeNull();
      const [stored] = newsFromGkg(row("Russian drones attack Ukraine"), now);
      const cached = {
        ...stored!,
        title,
        articleContext: {
          headline: title,
          themes: ["ARMEDCONFLICT", "MILITARY"],
        },
      };
      expect(selectEditorial([cached]).events).toEqual([]);
    }
    expect(
      articleTopic("Russian drones attack Ukraine", ["ARMEDCONFLICT"])?.kind,
    ).toBe("armed");
    expect(
      articleTopic("Court orders Israel to observe ceasefire", [
        "ARMEDCONFLICT",
      ])?.kind,
    ).toBe("diplomacy");
  });
});
describe("países e manchete", () => {
  it("reconhece abreviações explícitas das duas Coreias sem reduzir a notícia aos EUA", () => {
    expect(
      headlineCountries("S. Korea, US and N. Korea sanctions").map(
        (country) => country.code,
      ),
    ).toEqual(["KOR", "USA", "PRK"]);
  });
  it("evita países contidos em outros nomes e não interpreta o pronome us como Estados Unidos", () => {
    expect(
      headlineCountries("South Sudan conflict").map((country) => country.code),
    ).toEqual(["SSD"]);
    expect(
      headlineCountries("US embargo on Cuba").map((country) => country.code),
    ).toEqual(["USA", "CUB"]);
    expect(headlineCountries("Tell us about the war")).toEqual([]);
    expect(
      headlineCountries("US sanctions Rwandan defence ministry over M23 ties")
        .map((country) => country.code)
        .sort(),
    ).toEqual(["RWA", "USA"]);
    expect(
      headlineCountries("Sudanese and Ethiopian officials discuss a ceasefire")
        .map((country) => country.code)
        .sort(),
    ).toEqual(["ETH", "SDN"]);
  });
  it("decodifica texto indexado com entidades, Unicode e CDATA sem interpretar HTML", () => {
    expect(
      pageHeadline(
        "<PAGE_TITLE><![CDATA[Russia &amp; Ukraine &#x1F54A;]]></PAGE_TITLE>",
      ),
    ).toBe("Russia & Ukraine 🕊");
    expect(
      pageHeadline(
        "<PAGE_TITLE>&#99999999; &lt;b&gt;news&lt;/b&gt;</PAGE_TITLE>",
      ),
    ).toBe("� <b>news</b>");
  });
});
