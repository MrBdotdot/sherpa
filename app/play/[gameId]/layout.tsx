import { ServiceWorkerRegistration } from "@/app/_components/ServiceWorkerRegistration";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}
