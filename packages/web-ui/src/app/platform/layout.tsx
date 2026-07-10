import { PlatformAuthProvider } from "./platform-auth-context";
import { PlatformShell } from "./platform-shell";

export const metadata = {
  title: "Space platform — Agent Play",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthProvider>
  );
}
