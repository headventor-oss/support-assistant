import * as XLSX from "xlsx";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Sample data for a large finance transformation programme:
 * "Global Finance S/4HANA — Financial Data Migration & Operations".
 * Issues raised by a big project team working on financial data in SAP.
 */

const TODAY = new Date("2026-06-15T00:00:00Z");

interface Seed {
  category: string;
  type: string;
  issue: string;
  resolution: string;
  daysAgo: number; // when the issue was raised, relative to today
  fixDays: number | null; // days to resolve; null if not yet resolved
  status: "Open" | "In Progress" | "On Hold" | "Resolved" | "Closed";
  eta: string;
}

const seeds: Seed[] = [
  // ── General Ledger ──────────────────────────────
  {
    category: "General Ledger",
    type: "Data Quality",
    issue:
      "GL account master load failed for 1,240 accounts during the S/4HANA migration. Error 'Field BUKRS is not maintained' appears for company codes 2000 and 3000.",
    resolution:
      "Identified that the company-code segment was missing in the load file for two newly onboarded entities. Re-extracted the source with the FSV mapping, re-ran the LSMW load in batches of 500, and validated with FS00. All 1,240 accounts loaded successfully.",
    daysAgo: 2,
    fixDays: null,
    status: "In Progress",
    eta: "2 days",
  },
  {
    category: "General Ledger",
    type: "Configuration",
    issue:
      "Document splitting is not deriving the profit center on manually posted JV entries, causing the balance sheet to be unbalanced by profit center.",
    resolution:
      "Found the document splitting characteristic for Profit Center was not marked as 'Mandatory' and the splitting rule for the JV transaction type was incomplete. Updated config in SPRO (Document Splitting > Define Splitting Rule) and activated. Reposted affected documents.",
    daysAgo: 9,
    fixDays: 4,
    status: "Resolved",
    eta: "3 days",
  },
  {
    category: "General Ledger",
    type: "Bug/Defect",
    issue:
      "Foreign currency valuation run (FAGL_FCV) is posting incorrect unrealised gain/loss amounts for EUR-denominated accounts in the USD ledger.",
    resolution:
      "Root cause was an incorrect exchange-rate type (M instead of EURX) assigned to the valuation method. Corrected the valuation method in OB59, reversed the wrong batch via FAGL_FCV reversal, and re-ran the valuation. Finance confirmed corrected figures.",
    daysAgo: 38,
    fixDays: 6,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "General Ledger",
    type: "How-to / Training",
    issue:
      "New finance analysts are unsure how to park and post a recurring journal entry and keep raising duplicate manual postings.",
    resolution:
      "Ran a short enablement session covering FBD1 (recurring entry), F.14 (batch posting) and the parking/posting workflow (FV50). Shared a one-page SOP and recorded the walkthrough. Duplicate postings dropped to zero the following week.",
    daysAgo: 70,
    fixDays: 3,
    status: "Closed",
    eta: "1 day",
  },
  {
    category: "General Ledger",
    type: "Data Quality",
    issue:
      "Opening balance migration for the GL shows a difference of 18,500 USD between the legacy trial balance and the SAP migrated balance for company code 1000.",
    resolution:
      "Reconciliation traced the gap to two legacy suspense accounts that were excluded from the cutover scope. Posted the missing balances via FB01 with the migration document type and re-ran the reconciliation report — difference is now zero.",
    daysAgo: 120,
    fixDays: 5,
    status: "Closed",
    eta: "3 days",
  },

  // ── Accounts Payable ────────────────────────────
  {
    category: "Accounts Payable",
    type: "Interface Error",
    issue:
      "Vendor invoice IDocs from the procurement system are failing with status 51 'Tax code XX does not exist in company code 1000' for around 200 invoices per day.",
    resolution:
      "The procurement system was sending a legacy tax code not mapped in S/4HANA. Built a tax-code translation in the interface mapping and maintained the missing code in FTXP. Reprocessed the held IDocs via BD87. Failures dropped to zero.",
    daysAgo: 1,
    fixDays: null,
    status: "Open",
    eta: "2 days",
  },
  {
    category: "Accounts Payable",
    type: "Bug/Defect",
    issue:
      "Automatic payment run (F110) is excluding due invoices for vendor group DOMESTIC, leaving valid items unpaid and risking late-payment penalties.",
    resolution:
      "Discovered the payment method 'T' was not assigned in the vendor master for the affected group and the bank determination ranking was incomplete. Maintained payment method in XK02 and corrected ranking in FBZP. Test run confirmed all due items selected.",
    daysAgo: 5,
    fixDays: null,
    status: "In Progress",
    eta: "1 day",
  },
  {
    category: "Accounts Payable",
    type: "Data Quality",
    issue:
      "Duplicate vendor master records are causing duplicate invoice postings; the same supplier exists under three different vendor numbers after migration.",
    resolution:
      "Ran the duplicate vendor analysis (S_ALR_87012087) and identified 47 duplicate sets. Blocked the duplicates for posting, merged open items to the surviving master, and enabled the duplicate-invoice check (FB00 settings). Master data governance rule added.",
    daysAgo: 16,
    fixDays: 8,
    status: "Resolved",
    eta: "1 week",
  },
  {
    category: "Accounts Payable",
    type: "Configuration",
    issue:
      "Invoices are being blocked for payment with a price variance even though the PO price and invoice match, due to overly tight tolerance limits.",
    resolution:
      "Reviewed tolerance keys in OMR6 and found PP (price variance) set to 0%. Aligned the tolerance to the agreed 2% / 100 USD threshold with Finance, released wrongly blocked invoices via MRBR, and documented the policy.",
    daysAgo: 44,
    fixDays: 3,
    status: "Closed",
    eta: "2 days",
  },
  {
    category: "Accounts Payable",
    type: "Authorization",
    issue:
      "AP clerks cannot execute the payment proposal in F110 — they receive 'No authorisation for paying company code 1000'.",
    resolution:
      "Authorisation object F_REGU_BUK was missing the paying company code in the AP role. Security team updated the role, ran SU53 to confirm, and the clerks could generate the proposal. Added the check to the role-design baseline.",
    daysAgo: 95,
    fixDays: 2,
    status: "Closed",
    eta: "4 hours",
  },

  // ── Accounts Receivable ─────────────────────────
  {
    category: "Accounts Receivable",
    type: "Data Quality",
    issue:
      "Customer open items migrated without the correct dunning level, so the dunning run is sending first reminders to customers who are already 90+ days overdue.",
    resolution:
      "Migration omitted the dunning data (MHND). Loaded the dunning level and last-dunned date from legacy via a BAPI program, re-ran F150 in test, and verified correct dunning levels before the live run.",
    daysAgo: 4,
    fixDays: null,
    status: "In Progress",
    eta: "3 days",
  },
  {
    category: "Accounts Receivable",
    type: "Bug/Defect",
    issue:
      "Incoming bank payments are not being auto-cleared against customer invoices; the electronic bank statement leaves most AR items on the clearing account.",
    resolution:
      "The reference field carrying the invoice number was not mapped to the algorithm in the EBS posting rule. Updated the interpretation algorithm (OT83) to read the note-to-payee, and the auto-clearing rate improved from 35% to 92%.",
    daysAgo: 22,
    fixDays: 7,
    status: "Resolved",
    eta: "1 week",
  },
  {
    category: "Accounts Receivable",
    type: "Enhancement",
    issue:
      "Collections team wants an aged-receivables snapshot per business unit that is not available in standard reports without manual Excel work.",
    resolution:
      "Built a CDS-view-based Fiori analytical query exposing aging buckets by business unit and sales area, with drill-down to the customer line items. Collections now self-serve the report daily.",
    daysAgo: 140,
    fixDays: 20,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Accounts Receivable",
    type: "How-to / Training",
    issue:
      "Users don't know how to reverse a wrongly cleared customer payment and are raising tickets instead of self-serving.",
    resolution:
      "Documented the reset-and-reverse process (FBRA) with screenshots, including when to use reset only vs reset and reverse. Delivered a 30-minute clinic to the AR team.",
    daysAgo: 200,
    fixDays: 1,
    status: "Closed",
    eta: "4 hours",
  },

  // ── Asset Accounting ────────────────────────────
  {
    category: "Asset Accounting",
    type: "Data Quality",
    issue:
      "Legacy asset migration shows accumulated depreciation mismatches for 320 assets; the net book value in SAP differs from the legacy fixed-asset register.",
    resolution:
      "Found the depreciation start date and useful life were transposed for assets created mid-year. Corrected the takeover values via AS92, recalculated depreciation (AFAR), and reconciled NBV to the legacy register to the cent.",
    daysAgo: 3,
    fixDays: null,
    status: "In Progress",
    eta: "1 week",
  },
  {
    category: "Asset Accounting",
    type: "Configuration",
    issue:
      "Depreciation run (AFAB) terminates with 'Account determination error' for asset class MACHINERY in the new company code.",
    resolution:
      "The account determination (AO90) was not maintained for the depreciation area in the new company code. Maintained the GL account assignments, re-ran AFAB in test, and the run completed without errors.",
    daysAgo: 28,
    fixDays: 4,
    status: "Closed",
    eta: "2 days",
  },
  {
    category: "Asset Accounting",
    type: "Bug/Defect",
    issue:
      "Asset retirements posted via ABAVN are not removing the asset from the depreciation run, so retired assets keep depreciating.",
    resolution:
      "A custom substitution was overwriting the deactivation date on retirement. Disabled the faulty substitution rule (GGB1), reversed the affected retirements, and reposted. Retired assets no longer depreciate.",
    daysAgo: 60,
    fixDays: 9,
    status: "Closed",
    eta: "1 week",
  },

  // ── Bank & Cash ─────────────────────────────────
  {
    category: "Bank & Cash",
    type: "Interface Error",
    issue:
      "The MT940 electronic bank statement import is failing for the HSBC account with 'Invalid statement number / no posting rule found'.",
    resolution:
      "The bank changed its transaction-type codes; two new external codes were not mapped. Maintained the external transaction types and posting rules (OT83), reimported the statement (FF_5), and postings completed cleanly.",
    daysAgo: 6,
    fixDays: null,
    status: "Open",
    eta: "1 day",
  },
  {
    category: "Bank & Cash",
    type: "Data Quality",
    issue:
      "House bank and account IDs were migrated with inconsistent naming, breaking the link between the bank master and the payment program.",
    resolution:
      "Standardised the house bank / account ID naming convention, corrected the entries in FI12 (FBWW for newer release), and re-pointed the payment methods. Validated a test payment end to end.",
    daysAgo: 33,
    fixDays: 5,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Bank & Cash",
    type: "Performance",
    issue:
      "The daily cash position report (FF7B) takes over 12 minutes to run and times out for users during the morning peak.",
    resolution:
      "Grouping and planning levels were over-granular and the report had no date restriction. Added selection variants with a rolling date window and archived old planning data. Runtime dropped to under 90 seconds.",
    daysAgo: 110,
    fixDays: 11,
    status: "Closed",
    eta: "1 week",
  },

  // ── Tax ─────────────────────────────────────────
  {
    category: "Tax",
    type: "Configuration",
    issue:
      "Output VAT is calculating at the wrong rate for intra-EU sales after the migration; 19% is applied where 0% reverse-charge should be.",
    resolution:
      "The tax code condition records were copied from the legacy rate table without the reverse-charge indicator. Corrected the tax code in FTXP and the condition in FV12, then reposted the affected billing documents.",
    daysAgo: 7,
    fixDays: null,
    status: "In Progress",
    eta: "3 days",
  },
  {
    category: "Tax",
    type: "Bug/Defect",
    issue:
      "The advance VAT return report (S_ALR_87012357) is omitting documents posted with a manual tax line, understating the tax base.",
    resolution:
      "Manual tax postings were missing the tax base amount in the line item. Added a validation (GGB0) to enforce the base amount on manual tax lines and corrected the historical documents. Report now reconciles.",
    daysAgo: 52,
    fixDays: 6,
    status: "Closed",
    eta: "2 days",
  },
  {
    category: "Tax",
    type: "Data Quality",
    issue:
      "Vendor tax registration numbers (VAT IDs) are blank for 600 EU vendors, blocking compliant tax reporting.",
    resolution:
      "Sourced the missing VAT IDs from the procurement master and the EU VIES validation, mass-updated the vendor master (XK99 / MASS), and added a mandatory-field rule for new EU vendors.",
    daysAgo: 165,
    fixDays: 14,
    status: "Closed",
    eta: "1 week",
  },

  // ── Controlling (Cost Center) ───────────────────
  {
    category: "Controlling",
    type: "Configuration",
    issue:
      "Cost center assessment cycle (KSU5) is not allocating overhead to receiver cost centers; the cycle runs but posts zero.",
    resolution:
      "The sender values were zero because the tracing factor (statistical key figure) had no plan/actual values posted. Loaded the SKF values (KB31N), re-ran the cycle, and overhead allocated correctly.",
    daysAgo: 11,
    fixDays: 5,
    status: "Resolved",
    eta: "2 days",
  },
  {
    category: "Controlling",
    type: "Data Quality",
    issue:
      "Cost center master data migrated without the correct hierarchy assignment, so the standard hierarchy in KSH3 is missing 80 cost centers.",
    resolution:
      "Reassigned the orphaned cost centers to the correct nodes in the standard hierarchy (KSH2), validated the hierarchy totals, and locked the structure with change management.",
    daysAgo: 48,
    fixDays: 4,
    status: "Closed",
    eta: "2 days",
  },
  {
    category: "Controlling",
    type: "How-to / Training",
    issue:
      "Business controllers are unclear how to read actual vs plan variances in the new Fiori cost-center report and keep escalating non-issues.",
    resolution:
      "Delivered a guided session on the cost-center actual/plan/variance app, explaining the variance columns and drill-through. Published a quick-reference guide on the project portal.",
    daysAgo: 88,
    fixDays: 2,
    status: "Closed",
    eta: "4 hours",
  },

  // ── Master Data ─────────────────────────────────
  {
    category: "Master Data",
    type: "Data Quality",
    issue:
      "Profit center master records have inconsistent validity dates, causing 'Profit center not valid on posting date' errors on backdated postings.",
    resolution:
      "Extended the validity 'from' date on the affected profit centers (KE52) to cover the migration cutover period and reprocessed the failed postings. Added a check to the master-data creation template.",
    daysAgo: 8,
    fixDays: null,
    status: "Open",
    eta: "1 day",
  },
  {
    category: "Master Data",
    type: "Enhancement",
    issue:
      "There is no governance workflow for GL account creation; accounts are being created inconsistently across company codes by multiple teams.",
    resolution:
      "Implemented a master-data request workflow (SAP MDG-light using a custom Fiori form + approval) routing GL creation through a finance data steward. Standard templates enforce naming and FSG. Inconsistent creation stopped.",
    daysAgo: 175,
    fixDays: 25,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Master Data",
    type: "Data Quality",
    issue:
      "Bank details on customer master records failed validation during migration; IBANs for 410 customers are missing or malformed.",
    resolution:
      "Ran the IBAN validation report, sourced corrected IBANs from the legacy system and customer confirmations, and mass-updated via the customer master. Enabled IBAN validation on entry.",
    daysAgo: 130,
    fixDays: 12,
    status: "Closed",
    eta: "1 week",
  },

  // ── Reporting ───────────────────────────────────
  {
    category: "Reporting",
    type: "Performance",
    issue:
      "The financial statement version report (S_ALR_87012284) runs for 8+ minutes at month-end and several users get timeouts.",
    resolution:
      "Excessive drill-down and no ledger restriction caused full table scans. Added ledger and period selections, scheduled the heavy variant in background (SM37), and advised users to consume the Fiori balance-sheet app for interactive use.",
    daysAgo: 13,
    fixDays: 6,
    status: "Resolved",
    eta: "3 days",
  },
  {
    category: "Reporting",
    type: "Bug/Defect",
    issue:
      "The trial balance Fiori app shows different totals than the classic ABAP report (RFBILA00) for the same period and ledger.",
    resolution:
      "The CDS view behind the app was filtering on a single ledger while the classic report aggregated all ledgers. Aligned the app's ledger parameter and added a clear ledger selector. Totals now match.",
    daysAgo: 40,
    fixDays: 7,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Reporting",
    type: "Enhancement",
    issue:
      "Management wants a single month-end finance KPI dashboard instead of pulling five separate SAP reports manually.",
    resolution:
      "Built a consolidated Fiori overview page combining close status, AP/AR aging, cash position and P&L variance tiles sourced from CDS analytical queries. Reduced month-end reporting prep from hours to minutes.",
    daysAgo: 210,
    fixDays: 30,
    status: "Closed",
    eta: "1 week",
  },

  // ── Interfaces / Integration ────────────────────
  {
    category: "Interfaces",
    type: "Interface Error",
    issue:
      "The daily FX rate feed from the treasury system stopped updating; exchange rates in OB08 are three days stale, affecting valuations.",
    resolution:
      "The scheduled rate-import job failed silently after a treasury endpoint URL change. Updated the RFC destination, restored the TBDLS rate load job, backfilled the missing rates, and added job-failure alerting.",
    daysAgo: 2,
    fixDays: null,
    status: "Open",
    eta: "4 hours",
  },
  {
    category: "Interfaces",
    type: "Bug/Defect",
    issue:
      "Intercompany postings from the central hub are creating one-sided entries; the receiving company code document is not being generated.",
    resolution:
      "The IDoc for the partner company code was failing on a missing trading-partner assignment. Maintained the trading partner on the affected GL accounts and reprocessed via BD87. Both sides now post and the IC reconciliation balances.",
    daysAgo: 19,
    fixDays: 8,
    status: "Resolved",
    eta: "1 week",
  },
  {
    category: "Interfaces",
    type: "Performance",
    issue:
      "The nightly payroll-to-GL posting interface is overrunning its window and delaying the morning close activities.",
    resolution:
      "The interface posted document-by-document with a commit each time. Reworked it to post in summarised batches and parallelised across company codes. Runtime fell from 4 hours to 35 minutes.",
    daysAgo: 150,
    fixDays: 18,
    status: "Closed",
    eta: "1 week",
  },

  // ── Period-End Close ────────────────────────────
  {
    category: "Period-End Close",
    type: "Configuration",
    issue:
      "Users in the new company code cannot post in the current period — 'Posting period 003 is not open for account type S'.",
    resolution:
      "The posting-period variant for the new company code had not been opened for the account types. Opened the periods in OB52 for the relevant account-type ranges and confirmed posting succeeded.",
    daysAgo: 1,
    fixDays: null,
    status: "Open",
    eta: "2 hours",
  },
  {
    category: "Period-End Close",
    type: "How-to / Training",
    issue:
      "The close team is unsure of the correct sequence of month-end jobs (FX valuation, GR/IR, recurring entries, allocations) and ran them out of order.",
    resolution:
      "Documented the financial close checklist with the correct job sequence and dependencies, and configured the Advanced Financial Closing (AFC) task list to enforce the order. The next close ran without sequencing errors.",
    daysAgo: 75,
    fixDays: 5,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Period-End Close",
    type: "Bug/Defect",
    issue:
      "GR/IR clearing (F.13) is leaving thousands of items uncleared even where goods receipt and invoice quantities match.",
    resolution:
      "The clearing criteria did not include the purchase order item as a grouping characteristic. Adjusted the automatic clearing configuration (OB74) to group by PO and item, re-ran F.13, and the open GR/IR items reduced by 90%.",
    daysAgo: 57,
    fixDays: 10,
    status: "Closed",
    eta: "1 week",
  },

  // ── Intercompany ────────────────────────────────
  {
    category: "Intercompany",
    type: "Data Quality",
    issue:
      "Intercompany balances do not match between partner company codes at period end, with a recurring difference of around 45,000 USD.",
    resolution:
      "Differences were caused by FX rate timing — one side posted at the daily rate, the other at month-end. Standardised both sides to the month-end rate via a posting rule and built an IC reconciliation report. Difference now within rounding.",
    daysAgo: 14,
    fixDays: 9,
    status: "Resolved",
    eta: "1 week",
  },
  {
    category: "Intercompany",
    type: "Enhancement",
    issue:
      "The team needs an automated intercompany matching report; today reconciliation is a manual spreadsheet exercise taking two days each close.",
    resolution:
      "Implemented Intercompany Matching and Reconciliation (ICMR) with matching rules on document reference and amount. Auto-match rate reached 85%, cutting reconciliation effort to a few hours.",
    daysAgo: 230,
    fixDays: 28,
    status: "Closed",
    eta: "1 week",
  },

  // ── More recent / spread items to enrich trends ──
  {
    category: "General Ledger",
    type: "Authorization",
    issue:
      "Finance users were granted SAP_ALL in the migration sandbox by mistake and the same role template risks being promoted to production.",
    resolution:
      "Removed SAP_ALL, rebuilt least-privilege finance roles from the authorisation matrix, and added a pre-transport check to block wide-open profiles. Security signed off.",
    daysAgo: 4,
    fixDays: null,
    status: "On Hold",
    eta: "3 days",
  },
  {
    category: "Accounts Payable",
    type: "How-to / Training",
    issue:
      "New joiners keep asking how to see why a specific invoice was blocked and which tolerance it breached.",
    resolution:
      "Showed the team how to use MRBR and the invoice document flow to read the blocking reason, and added a short FAQ entry. Ticket volume on this topic dropped noticeably.",
    daysAgo: 6,
    fixDays: 1,
    status: "Resolved",
    eta: "2 hours",
  },
  {
    category: "Reporting",
    type: "Data Quality",
    issue:
      "Profit-center reporting shows large 'Not assigned' balances because some postings landed on a dummy profit center.",
    resolution:
      "Identified missing profit-center derivation rules for two account ranges. Maintained the derivation (3KEH/ FAGL3KEH) and reposted the dummy entries to the correct profit centers. 'Not assigned' balance reduced to near zero.",
    daysAgo: 10,
    fixDays: 4,
    status: "Resolved",
    eta: "3 days",
  },
  {
    category: "Asset Accounting",
    type: "How-to / Training",
    issue:
      "Users are unsure how to run a depreciation simulation before the live AFAB run and worry about posting wrong values.",
    resolution:
      "Demonstrated the depreciation simulation (S_ALR_87012936) and the AFAB test-run mode, and documented the steps. Team now validates before every live run.",
    daysAgo: 12,
    fixDays: 2,
    status: "Resolved",
    eta: "4 hours",
  },
  {
    category: "Bank & Cash",
    type: "Bug/Defect",
    issue:
      "Payment file (DMEE/PAIN.001) generated by F110 is rejected by the bank with a schema validation error on the creditor agent BIC.",
    resolution:
      "The BIC field was padded with trailing spaces by a custom mapping. Trimmed the field in the DMEE tree, regenerated the file, and the bank accepted it. Added a validation step to the payment process.",
    daysAgo: 3,
    fixDays: null,
    status: "In Progress",
    eta: "1 day",
  },
  {
    category: "Tax",
    type: "How-to / Training",
    issue:
      "Finance users don't know how to correct a posting that used the wrong tax code without reversing the entire document chain.",
    resolution:
      "Walked through the tax-code correction options (reversal vs adjustment posting) and when each applies, with examples. Provided a decision flowchart.",
    daysAgo: 26,
    fixDays: 1,
    status: "Closed",
    eta: "4 hours",
  },
  {
    category: "Controlling",
    type: "Bug/Defect",
    issue:
      "Internal order settlement (KO88) fails with 'Settlement rule missing' for capital projects migrated mid-stream.",
    resolution:
      "Migration did not carry the settlement rules. Maintained settlement rules (KO02) for the affected orders, ran KO88 in test, then posted. Capitalisation completed correctly.",
    daysAgo: 35,
    fixDays: 6,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Master Data",
    type: "Authorization",
    issue:
      "Data stewards cannot edit cost center master data in production — they only have display access after the role cutover.",
    resolution:
      "The change authorisation (object K_CSKS_SET with activity 02) was missing from the steward role. Security added it, validated with SU53, and stewards regained edit access.",
    daysAgo: 18,
    fixDays: 3,
    status: "Closed",
    eta: "1 day",
  },
  {
    category: "Accounts Receivable",
    type: "Performance",
    issue:
      "The dunning run (F150) for the whole customer base takes hours and locks customer master records for other users.",
    resolution:
      "Split the dunning run into parallel jobs by company code and dunning area and scheduled it overnight. Runtime dropped sharply and daytime locking complaints stopped.",
    daysAgo: 64,
    fixDays: 8,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Interfaces",
    type: "Data Quality",
    issue:
      "The concur expense interface posts employee reimbursements to a single default cost center instead of the employee's home cost center.",
    resolution:
      "The cost-center derivation in the inbound mapping used a hard-coded default. Replaced it with a lookup against the employee master, reprocessed the misposted documents, and reassigned costs correctly.",
    daysAgo: 42,
    fixDays: 7,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "General Ledger",
    type: "Performance",
    issue:
      "Posting large month-end accrual batches via FB50 is extremely slow and occasionally dumps with a time-out.",
    resolution:
      "Switched the mass accrual to the accrual engine and batch-input processing instead of interactive FB50, and posted in chunks. Performance and stability improved markedly.",
    daysAgo: 100,
    fixDays: 9,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Period-End Close",
    type: "Enhancement",
    issue:
      "There is no visibility of close progress across entities; the close lead chases status over email every day.",
    resolution:
      "Configured SAP Advanced Financial Closing with a monitored task list and status dashboard per company code. The close lead now sees real-time progress and bottlenecks.",
    daysAgo: 185,
    fixDays: 22,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Asset Accounting",
    type: "Data Quality",
    issue:
      "Asset useful life was migrated in months for some classes and years for others, producing wildly wrong depreciation.",
    resolution:
      "Standardised the useful-life unit during a corrective load, recalculated planned depreciation, and reconciled to the expected annual charge. Added a load validation to catch unit mismatches.",
    daysAgo: 78,
    fixDays: 11,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Accounts Payable",
    type: "Bug/Defect",
    issue:
      "Withholding tax is not being calculated on payments to certain vendors despite the WHT type being assigned.",
    resolution:
      "The WHT code was assigned but not activated as 'subject to WHT' in the vendor and the company-code WHT type was missing. Activated both, recalculated on open items, and validated the WHT return.",
    daysAgo: 30,
    fixDays: 5,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Reporting",
    type: "How-to / Training",
    issue:
      "Controllers want to export line-item reports to Excel with the layout preserved but lose formatting every time.",
    resolution:
      "Showed how to save and reuse display layouts and use the 'Spreadsheet' export with the correct format option, plus the Analysis for Office add-in for live refresh. Shared a short guide.",
    daysAgo: 55,
    fixDays: 1,
    status: "Closed",
    eta: "2 hours",
  },
  {
    category: "Bank & Cash",
    type: "Configuration",
    issue:
      "Cash management is not showing committed cash flows from purchase orders; the liquidity forecast only reflects posted documents.",
    resolution:
      "Activated the cash-management update for the relevant document categories and PO commitments, rebuilt the liquidity items, and the forecast now includes committed outflows.",
    daysAgo: 125,
    fixDays: 13,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Intercompany",
    type: "Bug/Defect",
    issue:
      "Intercompany invoices post with the wrong trading partner on the tax line, distorting the IC elimination at consolidation.",
    resolution:
      "A substitution set the trading partner on the base line but not the tax line. Extended the substitution rule to all line types and corrected historical documents. Consolidation eliminations now tie out.",
    daysAgo: 46,
    fixDays: 8,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Master Data",
    type: "Data Quality",
    issue:
      "GL accounts have inconsistent field status groups, allowing cost center to be entered on balance-sheet accounts and vice versa.",
    resolution:
      "Reviewed and reassigned field status groups (OBC4) per account category, corrected the mis-set accounts, and aligned the FSG with the posting-key field status. Erroneous field entries stopped.",
    daysAgo: 90,
    fixDays: 7,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Controlling",
    type: "Performance",
    issue:
      "The actual cost distribution cycle at month-end runs for over an hour and blocks downstream allocations.",
    resolution:
      "Consolidated overlapping cycles, removed redundant segments, and scheduled the cycle in background ahead of dependent steps. Runtime reduced to under 15 minutes.",
    daysAgo: 160,
    fixDays: 12,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "General Ledger",
    type: "Configuration",
    issue:
      "Parallel ledger (IFRS) is not picking up depreciation differences; only the leading ledger reflects the IFRS useful lives.",
    resolution:
      "The depreciation area for the IFRS ledger was not set to post to the non-leading ledger group. Corrected the ledger assignment in the depreciation area config and reposted the deltas. IFRS ledger now correct.",
    daysAgo: 68,
    fixDays: 10,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Accounts Receivable",
    type: "Configuration",
    issue:
      "Credit management is not blocking sales orders for customers over their credit limit; orders flow through unchecked.",
    resolution:
      "Credit control area was assigned but the credit check was not active in the sales document type. Activated the automatic credit check (OVA8) and set the risk categories. Over-limit orders are now blocked for review.",
    daysAgo: 24,
    fixDays: 6,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Tax",
    type: "Interface Error",
    issue:
      "The external tax engine (for US sales/use tax) is timing out intermittently, causing billing documents to post with zero tax.",
    resolution:
      "Network latency to the tax engine caused timeouts and a fallback to zero. Increased the RFC timeout, added a hard error instead of silent zero-tax fallback, and worked with infra to stabilise the connection.",
    daysAgo: 5,
    fixDays: null,
    status: "In Progress",
    eta: "2 days",
  },
  {
    category: "Period-End Close",
    type: "Data Quality",
    issue:
      "Recurring entry documents were migrated with expired run schedules, so several accruals were missed in the first live close.",
    resolution:
      "Reviewed and refreshed the recurring entry run dates (FBD2), posted the missed accruals manually for the period, and validated the schedule for the next close.",
    daysAgo: 36,
    fixDays: 4,
    status: "Closed",
    eta: "2 days",
  },
  {
    category: "Interfaces",
    type: "Authorization",
    issue:
      "The technical interface user lost authorisation after the role cleanup, halting the bank statement import job overnight.",
    resolution:
      "Restored the required FI posting and file-access authorisations to the interface service user, separated it from interactive role changes, and documented it as a protected technical account.",
    daysAgo: 8,
    fixDays: 2,
    status: "Resolved",
    eta: "1 day",
  },
  {
    category: "Accounts Payable",
    type: "Enhancement",
    issue:
      "AP wants automated invoice-to-PO matching and exception routing instead of manual three-way matching for thousands of invoices.",
    resolution:
      "Rolled out logistics invoice verification with automatic GR-based matching and exception workflow for variances. Manual matching effort fell substantially and on-time payment improved.",
    daysAgo: 195,
    fixDays: 26,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "General Ledger",
    type: "Data Quality",
    issue:
      "Some migrated open items have a blank assignment field, making clearing and reconciliation difficult for the GL team.",
    resolution:
      "Backfilled the assignment field using a sort-key-based update program derived from the document reference, and set the correct sort key on the affected accounts so new postings populate it automatically.",
    daysAgo: 105,
    fixDays: 9,
    status: "Closed",
    eta: "1 week",
  },
  {
    category: "Reporting",
    type: "Configuration",
    issue:
      "The financial statement version (FSV) groups several expense accounts under the wrong P&L node, misstating EBITDA in reports.",
    resolution:
      "Reorganised the FSV node assignments (OB58) to place the accounts under the correct P&L hierarchy, validated against the target reporting structure with Finance, and reran the statements.",
    daysAgo: 50,
    fixDays: 5,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Asset Accounting",
    type: "Configuration",
    issue:
      "Low-value asset (LVA) postings are capitalising instead of expensing because the LVA threshold was not configured in the new company code.",
    resolution:
      "Maintained the LVA maximum amount and the relevant depreciation key in asset configuration, reclassified the wrongly capitalised items, and confirmed correct expensing going forward.",
    daysAgo: 72,
    fixDays: 5,
    status: "Closed",
    eta: "2 days",
  },
  {
    category: "Controlling",
    type: "Data Quality",
    issue:
      "Statistical key figures used for allocations were not migrated, so the first month's overhead allocation produced no results.",
    resolution:
      "Loaded the SKF master and values (KK01 / KB31N) from the legacy planning data, re-ran the allocation cycles, and validated the receiver postings against expected ratios.",
    daysAgo: 58,
    fixDays: 6,
    status: "Closed",
    eta: "3 days",
  },
  {
    category: "Bank & Cash",
    type: "How-to / Training",
    issue:
      "Treasury users don't know how to manually post and clear a bank statement line that didn't auto-match.",
    resolution:
      "Demonstrated post-processing of the electronic bank statement (FEBAN / FEBA_BANK_STATEMENT) including manual assignment and clearing, and shared a step-by-step guide.",
    daysAgo: 20,
    fixDays: 1,
    status: "Closed",
    eta: "2 hours",
  },
];

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateFromDaysAgo(daysAgo: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

interface Row {
  Issue: string;
  Resolution: string;
  Category: string;
  Date_of_Issue: string;
  Type_of_Issue: string;
  Status: string;
  Date_of_Resolution: string;
  Estimated_Time_to_Fix: string;
}

const rows: Row[] = seeds.map((s) => {
  const issueDate = dateFromDaysAgo(s.daysAgo);
  const resolved = s.fixDays != null && (s.status === "Resolved" || s.status === "Closed");
  let resolutionDate = "";
  if (resolved) {
    const rd = new Date(issueDate);
    rd.setUTCDate(rd.getUTCDate() + (s.fixDays as number));
    // never in the future
    resolutionDate = rd > TODAY ? fmt(TODAY) : fmt(rd);
  }
  return {
    Issue: s.issue,
    Resolution: s.resolution,
    Category: s.category,
    Date_of_Issue: fmt(issueDate),
    Type_of_Issue: s.type,
    Status: s.status,
    Date_of_Resolution: resolutionDate,
    Estimated_Time_to_Fix: s.eta,
  };
});

const worksheet = XLSX.utils.json_to_sheet(rows, {
  header: [
    "Issue",
    "Resolution",
    "Category",
    "Date_of_Issue",
    "Type_of_Issue",
    "Status",
    "Date_of_Resolution",
    "Estimated_Time_to_Fix",
  ],
});

// widen columns for readability
worksheet["!cols"] = [
  { wch: 70 },
  { wch: 80 },
  { wch: 20 },
  { wch: 14 },
  { wch: 18 },
  { wch: 12 },
  { wch: 18 },
  { wch: 20 },
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "SAP FI Data Issues");

const outDir = join(__dirname, "..", "sample-data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "sap-financial-data-issues.xlsx");
XLSX.writeFile(workbook, outPath);

console.log(`Wrote ${rows.length} issues to ${outPath}`);
