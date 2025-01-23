import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import DownloadTermsButton from "@/components/DownloadTermsButton";
import { SecureDocument } from "@/components/ui/secure-document";

export default function TermsOfUse() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-secondary">
      <Navbar />
      <main className="flex-1">
        <div className="container max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6">Terms of Service</h1>
              <p className="text-gray-600">
                Read the full version of our terms of service.
              </p>
              <p className="text-gray-600 mb-8">
                If you have any questions, please send an email to{" "}
                <a
                  href="mailto:info@givny.org"
                  className="text-primary hover:underline"
                >
                  support@givny.org
                </a>
              </p>
              <DownloadTermsButton />
            </div>
            <div className="flex justify-center items-center">
              <SecureDocument />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
