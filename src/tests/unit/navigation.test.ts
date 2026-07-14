import assert from "node:assert/strict";
import test from "node:test";
import { getScreen, screenIds } from "../../app-shell/navigation.js";

test("app shell có các màn hình M1 tối thiểu và fallback an toàn", () => {
  assert.deepEqual(screenIds, ["home", "checkup", "reports", "privacy", "settings"]);
  assert.equal(getScreen("privacy").state, "OFFLINE");
  assert.equal(getScreen("không-tồn-tại").id, "home");
});
