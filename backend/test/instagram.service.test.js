const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSendPayload,
  getMissingInstagramConfig,
  getInstagramApiBaseUrl
} = require("../src/services/instagram.service");

test("builds Instagram Login API base URL from IG business account ID", () => {
  assert.equal(
    getInstagramApiBaseUrl({
      instagramApiVersion: "v25.0",
      instagramBusinessAccountId: "17841400000000000"
    }),
    "https://graph.instagram.com/v25.0/17841400000000000"
  );
});

test("builds Instagram Login API message payload without page messaging fields", () => {
  assert.deepEqual(
    buildSendPayload("igsid-1", { text: "Hello" }),
    {
      recipient: { id: "igsid-1" },
      message: { text: "Hello" }
    }
  );
});

test("reports missing Instagram Login API configuration without exposing secrets", () => {
  assert.deepEqual(
    getMissingInstagramConfig({
      instagramAccessToken: "",
      instagramBusinessAccountId: "",
      instagramApiVersion: ""
    }),
    [
      "INSTAGRAM_ACCESS_TOKEN or META_ACCESS_TOKEN",
      "INSTAGRAM_BUSINESS_ACCOUNT_ID or IG_PAGE_ID",
      "INSTAGRAM_API_VERSION or META_API_VERSION"
    ]
  );
});
