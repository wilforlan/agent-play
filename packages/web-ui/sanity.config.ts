"use client";

import { visionTool } from "@sanity/vision";
import { type PluginOptions, defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { unsplashImageAsset } from "sanity-plugin-asset-source-unsplash";

import { apiVersion, dataset, projectId, studioUrl } from "@/sanity/lib/api";
import { schemaTypes } from "@/sanity/schemas";

export default defineConfig({
  basePath: studioUrl,
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool(),
    unsplashImageAsset(),
    process.env.NODE_ENV === "development" && visionTool({ defaultApiVersion: apiVersion }),
  ].filter(Boolean) as PluginOptions[],
});
