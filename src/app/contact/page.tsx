import Footer from "@/components/Footer";
import Navbar from "@/components/ui/navbar";
import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/ContactForm";

export default function Contact() {
  return (
    <div className="flex flex-col bg-secondary">
      <main className="flex-1">
        <Navbar />
        <div className="grid md:grid-cols-[35%_65%] lg:h-[calc(100vh-56px)]">
          {/* Contact Information */}
          <div className="flex flex-row md:flex-col flex-wrap gap-8 px-6 lg:px-24 py-24">
            <div>
              <h2 className="text-2xl font-bold mb-3">Chat to us</h2>
              <div className="flex gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <a href="mailto:support@givny.org" className="hover:underline">support@givny.org</a>
              </div>
              <p className="text-gray-600 mt-2">Our friendly team is here to help.</p>
            </div>

            {/* <div>
              <h2 className="text-2xl font-bold mb-3">Office</h2>
              <div className="flex gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p>100 Smith Street, Collingwood VIC 3066 AU</p>
                </div>
              </div>
              <p className="text-gray-600 mt-2">Come say hello at our office HQ.</p>
            </div> */}
{/* 
            <div>
              <h2 className="text-2xl font-bold mb-3">Phone</h2>
              <div className="flex gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <p>+49 1525 8595009</p>
              </div>
              <p className="text-gray-600 mt-2">Mon-Fri from 8am to 5pm.</p>
            </div> */}
          </div>

          {/* Service Selection and Form */}
          <div className="bg-white px-6 lg:px-24 py-24">
            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
