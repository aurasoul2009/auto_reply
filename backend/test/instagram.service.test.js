const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSendPayload,
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
