import { localizedTemplate, t } from "../../../shared/i18n";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SessionRef } from "../../../shared/apiTypes";
import { isSessionMediaId, validImageDimensions } from "../../../shared/sessionMedia";
import { sessionMediaUrl } from "../api/urls";
import type { ChatImagePart } from "./shared";
import "./ImagePresentation";

export function transcriptImageSource(part: ChatImagePart, session?: SessionRef, machineId = "local"): { src: string; alt: string } | undefined {
  if (part.mediaId !== undefined) {
    if (session === undefined || !isSessionMediaId(part.mediaId)) return undefined;
    return { src: sessionMediaUrl(session, part.mediaId, machineId), alt: t("TranscriptImage.attached_image.0afeb548") };
  }
  return { src: `data:${part.mimeType};base64,${part.data}`, alt: t("TranscriptImage.attached_image.e5767737") };
}

@customElement("pi-web-transcript-image")
export class TranscriptImage extends LitElement {
  @property({ attribute: false }) imagePart: ChatImagePart | undefined;
  @property({ attribute: false }) session: SessionRef | undefined;
  @property() machineId = "local";
  @property({ type: Boolean }) loadingDisabled = false;

  override render() {
    const source = this.loadingDisabled || this.imagePart === undefined ? undefined : transcriptImageSource(this.imagePart, this.session, this.machineId)?.src;
    return localizedTemplate("TranscriptImage.template.f178d411", html)`<pi-web-image-presentation
      .source=${source} .requestDisabled=${true}
      .dimensions=${validImageDimensions(this.imagePart?.width, this.imagePart?.height)}
      .pendingLabel=${this.loadingDisabled ? t("TranscriptImage.image_loading_disabled.f82dfc52") : t("TranscriptImage.image_unavailable.d10d2aed")}
      description="attached image" label="attached image"
    ></pi-web-image-presentation>`;
  }

  static override styles = css`:host { display: block; max-width: 100%; min-width: 0; }`;
}
