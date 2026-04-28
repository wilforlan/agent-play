const assertValue = <T>(value: T | undefined | ""): T => {
  if (value === undefined || value === "") {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SANITY_DATASET");
  }
  return value;
};

const assertProjectId = <T>(value: T | undefined | ""): T => {
  if (value === undefined || value === "") {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID");
  }
  return value;
};

export const dataset = assertValue(process.env.NEXT_PUBLIC_SANITY_DATASET);
export const projectId = assertProjectId(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-02-28";
export const studioUrl = "/sanity/studio";