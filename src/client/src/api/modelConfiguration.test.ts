import { describe, expect, it } from "vitest";
import { modelConfigurationPath } from "./modelConfiguration";

describe("model configuration application references", () => {
  it("encodes the selected machine as one segment and leaves resolution to request", () => {
    expect(modelConfigurationPath("office/pc #1", "test")).toBe("api/machines/office%2Fpc%20%231/models/configuration/test");
  });
});
