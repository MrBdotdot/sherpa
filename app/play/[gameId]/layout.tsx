import { ServiceWorkerRegistration } from "@/app/_components/ServiceWorkerRegistration";
import { PostHogProvider } from "@/app/_components/PostHogProvider";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorkerRegistration />
      <PostHogProvider>{children}</PostHogProvider>
    </>
  );
}
