import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import DownloadTermsButton from "@/components/DownloadTermsButton";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
            Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully before using our platform
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg prose-gray max-w-none">
          <div className="bg-gray-50 rounded-lg p-8 mb-12">
            <p className="text-gray-700 leading-relaxed mb-0">
              These Terms and Conditions govern your use of our website, mobile application, and services. 
              By accessing or using Givny, you agree to comply with and be bound by these Terms.
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Definitions</h2>
              <p className="text-gray-700 leading-relaxed">
                Givny refers to the platform owned and operated by Givnt Ltd. A &ldquo;User&rdquo; refers to anyone 
                registering for or using the Services, including donors and recipients. &ldquo;Items&rdquo; refer to 
                goods listed, requested, or exchanged on the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Eligibility</h2>
              <p className="text-gray-700 leading-relaxed">
                You must be at least 18 years old to use our Platform. Users under 18 may use the Platform 
                only under the supervision of a parent or guardian. By registering, you represent and warrant 
                that all information you provide is accurate and complete.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Account Registration</h2>
              <p className="text-gray-700 leading-relaxed">
                Users must create an account to list, request, or receive items. You are responsible for 
                maintaining the confidentiality of your account credentials and all activities under your account. 
                If you suspect unauthorized use of your account, notify us immediately at 
                <a href="mailto:support@givny.com" className="text-blue-600 hover:text-blue-800 underline">
                  support@givny.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to use the Platform only for lawful purposes. Users may not post or share false, 
                misleading, or fraudulent information. You may not use the Platform to harass, abuse, or harm 
                others or engage in activities that damage or impair the operation of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Donations & Exchanges</h2>
              <p className="text-gray-700 leading-relaxed">
                Users can create listings for items they no longer need by providing accurate descriptions, 
                photos, and item conditions. All items exchanged through the Platform must be free, and selling 
                items is strictly prohibited. Givny facilitates connections but does not guarantee successful 
                exchanges.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Prohibited Items</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed mb-3">
                  The following items cannot be listed on the Platform:
                </p>
                <ul className="text-gray-700 space-y-1 ml-4">
                  <li>• Hazardous materials (chemicals, explosives)</li>
                  <li>• Expired or perishable food</li>
                  <li>• Broken or non-functional electronics</li>
                  <li>• Weapons, firearms, or drugs</li>
                  <li>• Items promoting discrimination or violence</li>
                  <li>• Illegal or restricted goods</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Privacy & Data</h2>
              <p className="text-gray-700 leading-relaxed">
                We collect and process your personal data in accordance with our Privacy Policy. 
                By using the Platform, you consent to our collection, storage, and use of your 
                information as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Limitation of Liability</h2>
                             <p className="text-gray-700 leading-relaxed">
                 Givny is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no warranties regarding the 
                 platform&apos;s accuracy, reliability, or availability. To the fullest extent permitted 
                 by law, Givny shall not be liable for any indirect, incidental, or consequential 
                 damages arising from your use of the Platform.
               </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violations 
                of these Terms. You may terminate your account at any time in account settings or by 
                contacting us at 
                <a href="mailto:support@givny.com" className="text-blue-600 hover:text-blue-800 underline">
                  support@givny.com
                </a>.
              </p>
            </section>
          </div>

          <div className="border-t border-gray-200 pt-12 mt-16">
            <div className="text-center">
              <p className="text-gray-600 mb-8">
                For questions about these Terms, contact us at{" "}
                <a href="mailto:support@givny.com" className="text-blue-600 hover:text-blue-800 underline">
                  support@givny.com
                </a>
              </p>
              
              <div className="mb-8">
                <DownloadTermsButton />
              </div>
              
              <p className="text-sm text-gray-500 italic">
                By using Givny, you acknowledge that you have read, understood, and agree to these Terms and Conditions.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
