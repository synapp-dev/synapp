import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: steamId } = await context.params;

    if (!steamId) {
      return NextResponse.json(
        { error: "Steam ID is required" },
        { status: 400 }
      );
    }

    // Validate Steam ID format (should be 17 digits for Steam ID64)
    if (!/^\d{17}$/.test(steamId)) {
      return NextResponse.json(
        {
          error:
            "Invalid Steam ID format. Please provide a valid Steam ID64 (17 digits)",
        },
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

      // Get season info (S1, S2, S3) and convert to number
      const seasonText = $rank.find(".over .icon").last().text().trim();
      const season = seasonText.startsWith("S")
        ? parseInt(seasonText.substring(1))
        : null;

      // Get rank value and convert to number
      const rankElement = $rank.find(".rank .cs2rating span").first();
      const rankValueText = rankElement.text().trim();
      const current = rankValueText
        ? parseInt(rankValueText.replace(/,/g, ""))
        : null;

      // Get best value and convert to number
      const bestElement = $rank.find(".best .cs2rating span").first();
      const bestValueText = bestElement.text().trim();
      const peak = bestValueText
        ? parseInt(bestValueText.replace(/,/g, ""))
        : null;

      // Get date and convert to timestamp
      const dateText = $rank.find(".bottom .date span").text().trim();
      let last_match = null;
      if (dateText) {
        try {
          // Parse date like "sat 19th july 25" to a proper date
          const date = new Date(dateText);
          last_match = date.toISOString();
        } catch (error) {
          console.warn(`Failed to parse date: ${dateText}`);
        }
      }

      // Get wins and convert to number
      const winsText = $rank.find(".bottom .wins b").text().trim();
      const total_wins = winsText ? parseInt(winsText.replace(/,/g, "")) : 0;

      // Only include Premier - exclude FACEIT, WINGMAN, and map-specific ranks
      const isMapRank =
        (icon && icon.startsWith("de_")) || (icon && icon.startsWith("cs_"));
      const isWingman = icon && icon.includes("Wingman");
      const isFaceit = icon && icon.toLowerCase().includes("faceit");

      if ((icon || current || peak) && !isMapRank && !isFaceit && !isWingman) {
        ranksData.push({
          season,
          current,
          peak,
          last_match,
          total_wins,
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
