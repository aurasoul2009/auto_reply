const XLSX = require("xlsx");
const Contact = require("../models/Contact");
const { normalizePhone } = require("../utils/phone");
const { ApiError } = require("../utils/apiResponse");

function readRows(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    sheetRows: 10002
  });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new ApiError(400, "The workbook has no worksheets");

  return XLSX.utils.sheet_to_json(firstSheet, {
    defval: "",
    raw: false
  });
}

async function importContactsFromBuffer(fileBuffer) {
  if (!fileBuffer) {
    throw new ApiError(400, "An Excel file is required");
  }

  const rows = readRows(fileBuffer);
  if (rows.length === 0) {
    throw new ApiError(400, "The uploaded worksheet is empty");
  }
  if (rows.length > 10000) {
    throw new ApiError(400, "A maximum of 10,000 contact rows is allowed");
  }

  const normalizedRows = rows.map((row, index) => ({
    row: index + 2,
    name: String(row.name || row.Name || "").trim(),
    originalPhone: row.phone || row.Phone || "",
    phone: normalizePhone(row.phone || row.Phone)
  }));

  const invalidNumbers = normalizedRows
    .filter((row) => !row.phone)
    .map((row) => ({ row: row.row, phone: String(row.originalPhone) }));

  const seen = new Set();
  const duplicates = [];
  const uniqueRows = [];

  for (const row of normalizedRows.filter((item) => item.phone)) {
    if (seen.has(row.phone)) {
      duplicates.push({ row: row.row, phone: row.phone, source: "file" });
    } else {
      seen.add(row.phone);
      uniqueRows.push(row);
    }
  }

  const existingContacts = await Contact.find({
    phone: { $in: uniqueRows.map((row) => row.phone) }
  })
    .select("phone")
    .lean();
  const existingPhones = new Set(existingContacts.map((contact) => contact.phone));

  const toInsert = uniqueRows.filter((row) => {
    if (existingPhones.has(row.phone)) {
      duplicates.push({ row: row.row, phone: row.phone, source: "database" });
      return false;
    }
    return true;
  });

  if (toInsert.length) {
    await Contact.insertMany(
      toInsert.map((row) => ({
        name: row.name,
        phone: row.phone,
        source: "excel",
        subscribed: true,
        optIn: true
      })),
      { ordered: false }
    );
  }

  return {
    totalRows: rows.length,
    inserted: toInsert.length,
    skipped: invalidNumbers.length + duplicates.length,
    duplicates,
    invalidNumbers
  };
}

module.exports = { importContactsFromBuffer, readRows };
