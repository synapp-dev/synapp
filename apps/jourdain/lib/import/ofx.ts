// Tolerant parser for OFX bank exports (CommBank "OFX" download option).
//
// CommBank exports OFX 1.x, which is SGML — element tags like <TRNAMT> are NOT
// closed (the value runs from after the tag to the next tag or newline), while
// aggregates like <STMTTRN>...</STMTTRN> usually are. So we don't use an XML
// parser; we extract fields tolerantly with bounded regex.

export type ParsedOfxTransaction = {
  /** Financial-institution transaction id — stable, use it to dedupe imports. */
  fitId: string;
  /** Posted date as YYYY-MM-DD. */
  date: string | null;
  /** Signed amount: negative = money out, positive = money in. */
  amount: number;
  /** OFX TRNTYPE (DEBIT, CREDIT, PAYMENT, …). */
  type: string | null;
  /** Best human description (NAME, falling back to MEMO). */
  description: string;
  /** MEMO when it adds detail beyond the description, else null. */
  memo: string | null;
};

export type ParsedOfxStatement = {
  /** ACCTID from the statement (often masked, e.g. last digits). */
  accountId: string | null;
  /** BANKID — the BSB for bank accounts; null for credit cards. */
  bankId: string | null;
  /** ACCTTYPE for bank accounts; null for credit cards (CCACCTFROM). */
  accountType: string | null;
  currency: string | null;
  /** LEDGERBAL balance (the account balance) when present. */
  balance: number | null;
  /** Balance "as of" date as YYYY-MM-DD. */
  balanceDate: string | null;
  transactions: ParsedOfxTransaction[];
};

/** First inline value for an unclosed SGML tag, bounded to the line/next tag. */
function field(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block);
  if (!match) return null;
  const value = (match[1] ?? "").trim();
  return value.length > 0 ? value : null;
}

/** OFX dates look like YYYYMMDD[HHMMSS[.xxx[tz]]] — we only need the date. */
function parseOfxDate(raw: string | null): string | null {
  if (!raw) return null;
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(raw.trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function parseAmount(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseTransactions(statement: string): ParsedOfxTransaction[] {
  // Each chunk after a <STMTTRN> tag is one transaction; bound it at the
  // closing tag so fields can't bleed into the next transaction or the balance.
  const chunks = statement.split(/<STMTTRN>/i).slice(1);
  const transactions: ParsedOfxTransaction[] = [];

  for (const chunk of chunks) {
    const block = chunk.split(/<\/STMTTRN>/i)[0] ?? chunk;
    const name = field(block, "NAME");
    const memo = field(block, "MEMO");
    const description = name ?? memo ?? "—";

    transactions.push({
      fitId: field(block, "FITID") ?? "",
      date: parseOfxDate(field(block, "DTPOSTED")),
      amount: parseAmount(field(block, "TRNAMT")),
      type: field(block, "TRNTYPE"),
      description,
      memo: memo && memo !== description ? memo : null,
    });
  }

  return transactions;
}

function parseStatement(statement: string): ParsedOfxStatement {
  const ledger =
    /<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i.exec(statement)?.[1] ?? statement;
  const rawBalance = field(ledger, "BALAMT");

  return {
    accountId: field(statement, "ACCTID"),
    bankId: field(statement, "BANKID"),
    accountType: field(statement, "ACCTTYPE"),
    currency: field(statement, "CURDEF"),
    balance: rawBalance != null ? parseAmount(rawBalance) : null,
    balanceDate: parseOfxDate(field(ledger, "DTASOF")),
    transactions: parseTransactions(statement),
  };
}

/**
 * Parse an OFX file into one statement per account (CommBank exports a single
 * account per file, but multiple <STMTRS> blocks are handled just in case).
 */
export function parseOfx(content: string): ParsedOfxStatement[] {
  const blocks = [...content.matchAll(/<STMTRS>([\s\S]*?)<\/STMTRS>/gi)].map(
    (match) => match[1] ?? ""
  );
  const statements = blocks.length > 0 ? blocks : [content];
  return statements.map(parseStatement);
}
