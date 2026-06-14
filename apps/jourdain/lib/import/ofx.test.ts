import { describe, expect, it } from "vitest";
import { parseOfx } from "./ofx";

// Mirrors a real CommBank OFX export: BANKACCTFROM with a BSB (BANKID),
// date-only DTPOSTED, a separate DTUSER, MEMO-only (no NAME), and both a
// LEDGERBAL and an AVAILBAL (the balance must come from LEDGERBAL).
const SAMPLE_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>AUD
<BANKACCTFROM>
<BANKID>062692
<ACCTID>16987096
<ACCTTYPE>SAVINGS
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260605000000
<DTEND>20260613000000
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260613
<DTUSER>20260611
<TRNAMT>-42.17
<FITID>H243397496859_000020
<MEMO>UBER *EATS HELP.UBER.C Sydney AU AUS Card xx2050 Value Date: 11/06/2026
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260610
<DTUSER>20260610
<TRNAMT>6019.33
<FITID>N861061812664
<MEMO>Fast Transfer From GLENN RUSHTON A Girton Salary
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>5694.78
<DTASOF>20260614064751
</LEDGERBAL>
<AVAILBAL>
<BALAMT>5431.97
<DTASOF>20260614064751
</AVAILBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

describe("parseOfx", () => {
  it("parses the account, BSB and the LEDGERBAL (not AVAILBAL) balance", () => {
    const statements = parseOfx(SAMPLE_OFX);
    expect(statements).toHaveLength(1);

    const statement = statements[0]!;
    expect(statement.currency).toBe("AUD");
    expect(statement.accountId).toBe("16987096");
    expect(statement.bankId).toBe("062692");
    expect(statement.accountType).toBe("SAVINGS");
    expect(statement.balance).toBe(5694.78);
    expect(statement.balance).not.toBe(5431.97); // guard: don't grab AVAILBAL
    expect(statement.balanceDate).toBe("2026-06-14");
    expect(statement.transactions).toHaveLength(2);
  });

  it("extracts signed amounts, dates, FITIDs and MEMO descriptions", () => {
    const [statement] = parseOfx(SAMPLE_OFX);
    const [debit, credit] = statement!.transactions;

    expect(debit).toMatchObject({
      fitId: "H243397496859_000020",
      date: "2026-06-13",
      amount: -42.17,
      type: "DEBIT",
      description:
        "UBER *EATS HELP.UBER.C Sydney AU AUS Card xx2050 Value Date: 11/06/2026",
      memo: null,
    });

    expect(credit).toMatchObject({
      fitId: "N861061812664",
      date: "2026-06-10",
      amount: 6019.33,
      type: "CREDIT",
      description: "Fast Transfer From GLENN RUSHTON A Girton Salary",
    });
  });

  it("gives every transaction a stable, unique FITID for dedupe", () => {
    const [statement] = parseOfx(SAMPLE_OFX);
    const ids = statement!.transactions.map((t) => t.fitId);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
