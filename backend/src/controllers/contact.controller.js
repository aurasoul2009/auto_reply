const Contact = require("../models/Contact");
const { normalizePhone } = require("../utils/phone");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const {
  importContactsFromBuffer
} = require("../services/contactImport.service");

function paginationFrom(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

async function listContacts(req, res) {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = {};

  if (req.query.subscribed !== undefined) {
    filter.subscribed = req.query.subscribed === "true";
  }
  if (req.query.optIn !== undefined) {
    filter.optIn = req.query.optIn === "true";
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter)
  ]);

  return sendSuccess(res, {
    contacts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

async function addContact(req, res) {
  const { name = "", phone, instagramId, tags = [], optIn = false } = req.body;
  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  if (phone && !normalizedPhone) {
    throw new ApiError(400, "Invalid phone number");
  }
  if (!normalizedPhone && !instagramId) {
    throw new ApiError(400, "phone or instagramId is required");
  }
  if (!Array.isArray(tags)) {
    throw new ApiError(400, "tags must be an array");
  }
  if (typeof optIn !== "boolean") {
    throw new ApiError(400, "optIn must be a boolean");
  }

  const contact = await Contact.create({
    name,
    phone: normalizedPhone,
    instagramId: instagramId ? String(instagramId).trim() : undefined,
    source: "manual",
    subscribed: true,
    optIn,
    tags: tags.map(String)
  });

  return sendSuccess(res, contact, "Contact added", 201);
}

async function uploadContacts(req, res) {
  if (!req.file) {
    throw new ApiError(400, "An Excel file is required in the file field");
  }

  const result = await importContactsFromBuffer(req.file.buffer);

  return sendSuccess(
    res,
    result,
    "Contact upload processed"
  );
}

async function unsubscribeContact(req, res) {
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { subscribed: false, optIn: false },
    { new: true }
  );

  if (!contact) throw new ApiError(404, "Contact not found");
  return sendSuccess(res, contact, "Contact unsubscribed");
}

module.exports = {
  listContacts,
  addContact,
  uploadContacts,
  unsubscribeContact
};
