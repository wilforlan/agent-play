import { ScannerNodeClient } from "./scanner-node-client";

type PageProps = {
  params: Promise<{ nodeId: string }>;
};

export default async function ScannerNodePage(_props: PageProps) {
  return <ScannerNodeClient />;
}
