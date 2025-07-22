import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get("steamId");

    if (!steamId) {
      return NextResponse.json(
        { error: "Steam ID is required" },
        { status: 400 }
      );
    }

    // Construct the URL for the player
    const url = `https://csstats.gg/player/${steamId}`;

    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PostmanRuntime/7.44.0",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        Cookie: "XSRF-TOKEN=working",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch data: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract player information
    const playerName = $("#player-name").text().trim();
    const playerAvatar = $("#player-avatar img").attr("src");

    // Extract CS2 and FACEIT statistics
    const ranksData: any[] = [];

    // Find all rank entries
    $(".ranks").each((index, element) => {
      const $rank = $(element);

      // Get the icon (FACEIT, Premier, etc.)
      const icon =
        $rank.find(".over .icon img").attr("alt") ||
        $rank.find(".over .icon img").attr("title") ||
        "";

      // Get season info (S1, S2, S3)
      const season = $rank.find(".over .icon").last().text().trim();

      // Get rank value
      const rankElement = $rank.find(".rank .cs2rating span").first();
      const rankValue = rankElement.text().trim();
      const rankClass = $rank.find(".rank .cs2rating").attr("class") || "";

      // Get best value
      const bestElement = $rank.find(".best .cs2rating span").first();
      const bestValue = bestElement.text().trim();
      const bestClass = $rank.find(".best .cs2rating").attr("class") || "";

      // Get date
      const date = $rank.find(".bottom .date span").text().trim();

      // Get wins
      const wins = $rank.find(".bottom .wins b").text().trim();

      // Get rank image for FACEIT
      const rankImg = $rank.find(".rank img.rank").attr("src");
      const bestImg = $rank.find(".best img.rank").attr("src");

      // Only include Premier and WINGMAN - exclude FACEIT and map-specific ranks
      const isMapRank =
        (icon && icon.startsWith("de_")) || (icon && icon.startsWith("cs_"));
      const isWingman = icon && icon.includes("WINGMAN");
      const isFaceit = icon && icon.toLowerCase().includes("faceit");

      if ((icon || rankValue || bestValue) && !isMapRank && !isFaceit) {
        ranksData.push({
          icon,
          season,
          rank: {
            value: rankValue,
            class: rankClass,
            image: rankImg,
          },
          best: {
            value: bestValue,
            class: bestClass,
            image: bestImg,
          },
          date,
          wins: wins || "0",
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        steamId,
        playerName,
        playerAvatar,
        ranks: ranksData,
        url,
      },
    });
  } catch (error) {
    console.error("Error scraping csstats.gg:", error);
    return NextResponse.json(
      { error: "Failed to scrape player data" },
      { status: 500 }
    );
  }
}
