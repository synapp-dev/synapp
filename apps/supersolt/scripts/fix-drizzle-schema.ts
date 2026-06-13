import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BYTEA_HELPER = `const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
  dataType() {
    return "bytea";
  },
});
`;

function fixDrizzleSchema() {
  const schemaPath = join(__dirname, "../drizzle/schema.ts");
  let content = readFileSync(schemaPath, "utf-8");
  const originalContent = content;

  // drizzle-kit occasionally emits malformed default string literals
  content = content.replace(/\.default\('\)/g, ".default(sql`NULL`)");

  // drizzle-kit sometimes emits legacy securityInvoker payload
  content = content.replace(
    /\.with\(\{"securityInvoker":"on"\}\)/g,
    ".with({ securityInvoker: true })"
  );

  // drizzle-kit fails to map bytea in auth schema
  content = content.replace(/\bunknown\(/g, "bytea(");
  if (content.includes("bytea(") && !content.includes("const bytea = customType")) {
    content = content.replace(
      'import { pgTable, pgSchema',
      'import { customType, pgTable, pgSchema',
    );
    content = content.replace(
      'export const auth = pgSchema("auth");',
      `${BYTEA_HELPER}\nexport const auth = pgSchema("auth");`,
    );
  }

  // Break circular FKs that prevent TypeScript from inferring table types
  content = content.replace(
    /\tforeignKey\(\{\s*\n\t\t\tcolumns: \[table\.activeSupplierProductId\],\s*\n\t\t\tforeignColumns: \[supplierProducts\.id\],\s*\n\t\t\tname: "ingredients_active_supplier_product_id_fkey"\s*\n\t\t\}\)\.onDelete\("set null"\),\s*\n/,
    "",
  );
  content = content.replace(
    /\tforeignKey\(\{\s*\n\t\t\tcolumns: \[table\.linkedInvoiceId\],\s*\n\t\t\tforeignColumns: \[venueInvoices\.id\],\s*\n\t\t\tname: "purchase_orders_linked_invoice_id_fkey"\s*\n\t\t\}\)\.onDelete\("set null"\),\s*\n/,
    "",
  );
  content = content.replace(
    /\tforeignKey\(\{\s*\n\t\t\tcolumns: \[table\.payrollExportId\],\s*\n\t\t\tforeignColumns: \[payRuns\.id\],\s*\n\t\t\tname: "pay_periods_payroll_export_id_fkey"\s*\n\t\t\}\)\.onDelete\("set null"\),\s*\n/,
    "",
  );

  if (content !== originalContent) {
    writeFileSync(schemaPath, content, "utf-8");
  }
}

fixDrizzleSchema();
