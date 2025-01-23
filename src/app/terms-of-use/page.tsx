import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import DownloadTermsButton from "@/components/DownloadTermsButton";
import { SecureDocument } from "@/components/ui/secure-document";

export default function TermsOfUse() {
  return (
    <div className="flex flex-col bg-secondary">
      <Navbar />
      <main className="flex-1 relative overflow-hidden">
        <div className="container h-full max-w-8xl mx-auto px-4">
          <div className="grid h-full grid-cols-1 md:grid-cols-[60%_40%] gap-12">
            <div className="overflow-y-auto py-16 md:py-24 pr-4 h-screen">
              <h1 className="text-5xl font-bold mb-6">Terms and Conditions</h1>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 mb-4">
                  These Terms and Conditions ("Terms") govern your use of our website, mobile application, and services (collectively, "Services"). By accessing or using Givny, you agree to comply with and be bound by these Terms. If you do not agree, please refrain from using our Services.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Definitions</h2>
                <p className="text-gray-600 mb-4">
                  Givny refers to the platform owned and operated by Givnt Ltd. A "User" refers to anyone registering for or using the Services, including donors and recipients. "Items" refer to goods listed, requested, or exchanged on the Platform.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Eligibility</h2>
                <p className="text-gray-600 mb-4">
                  You must be at least 18 years old to use our Platform. Users under 18 may use the Platform only under the supervision of a parent or guardian. By registering, you represent and warrant that all information you provide is accurate and complete.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Account Registration and Security</h2>
                <p className="text-gray-600 mb-4">
                  Users must create an account to list, request, or receive items. You are responsible for maintaining the confidentiality of your account credentials and all activities under your account. If you suspect unauthorized use of your account, notify us immediately at support@givny.com.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Acceptable Use</h2>
                <p className="text-gray-600 mb-4">
                  You agree to use the Platform only for lawful purposes. Users may not post or share false, misleading, or fraudulent information. You may not use the Platform to harass, abuse, or harm others or engage in activities that damage or impair the operation of the Platform. Listing prohibited items is strictly forbidden.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Listing and Requesting Items</h2>
                <p className="text-gray-600 mb-4">
                  Users can create listings for items they no longer need by providing accurate descriptions, photos, and item conditions. Interested individuals can request listed items by contacting the donor through the Platform. All items exchanged through the Platform must be free, and selling items is strictly prohibited.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Donation and Exchange Process</h2>
                <p className="text-gray-600 mb-4">
                  Givny facilitates connections between donors and recipients but does not guarantee the successful exchange of items. Users are responsible for coordinating the pickup or delivery of items. Givny is not responsible for the condition, safety, or functionality of exchanged items.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">Prohibited Items</h2>
                <p className="text-gray-600 mb-4">
                  The following items cannot be listed on the Platform: hazardous materials (e.g., chemicals, explosives), expired or perishable food, broken or non-functional electronics, weapons, firearms or drugs, items that promote discrimination, or violence, and illegal or restricted goods.
                </p>

                <section className="space-y-4" id="#privacy">
                    <h2 className="text-2xl font-semibold mt-6 mb-3">Privacy and Data Use</h2>
                    <p className="text-gray-600 mb-4">
                    We collect and process your personal data in accordance with our Privacy Policy. By using the Platform, you consent to our collection, storage, and use of your information as described in the Privacy Policy.
                    </p>

                    <h2 className="text-2xl font-semibold mt-6 mb-3">Intellectual Property</h2>
                    <p className="text-gray-600 mb-4">
                    All content on the Platform, including text, graphics, logos, and software, is owned by Givny or its licensors. Users may not copy, reproduce, or distribute Platform content without prior written permission.
                    </p>

                    <h2 className="text-2xl font-semibold mt-6 mb-3">Disclaimer of Warranties</h2>
                    <p className="text-gray-600 mb-4">
                    Givny is provided "as is" and "as available." We make no warranties, express or implied, regarding the platform's accuracy, reliability, or availability. Givny disclaims liability for any harm resulting from the use of items exchanged through the Platform.
                    </p>

                    <h2 className="text-2xl font-semibold mt-6 mb-3">Limitation of Liability</h2>
                    <p className="text-gray-600 mb-4">
                    To the fullest extent permitted by law, Givny shall not be liable for any indirect, incidental, or consequential damages arising from or related to your use of the Platform.
                    </p>

                    <h2 className="text-2xl font-semibold mt-6 mb-3">Termination</h2>
                    <p className="text-gray-600 mb-4">
                    We reserve the right to suspend or terminate your account at any time for violations of these Terms or other improper use of the Platform. You may terminate your account at any time in account settings or by contacting us at support@givny.com.
                    </p>

                    <h2 className="text-2xl font-semibold mt-6 mb-3">Modifications to Terms</h2>
                    <p className="text-gray-600 mb-4">
                    We may update these Terms occasionally to reflect changes in our Services or legal requirements. Continued use of the Platform after changes are made constitutes acceptance of the updated Terms.
                    </p>

                    <h2 className="text-2xl font-semibold mt-6 mb-3">Contact Information</h2>
                    <p className="text-gray-600 mb-4">
                    For questions or concerns about these Terms, please contact us at{" "}
                    <a href="mailto:support@givny.org" className="text-primary hover:underline">
                        support@givny.org
                    </a>
                    </p>

                    <p className="text-gray-600 mt-8 italic">
                    By using Givny, you acknowledge that you have read, understood, and agree to these Terms and Conditions.
                    </p>
                </section>
              </div>
              <div className="mt-8">
                <DownloadTermsButton />
              </div>
            </div>
            <div className="hidden md:flex justify-center items-center">
              <SecureDocument />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
