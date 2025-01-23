"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea";

const services = [
  {
    title: "Support",
    description: "I need help with Givny.",
    icon: "🛠️",
    id: "support",
  },
  {
    title: "Partnership",
    description: "Partner with Givny.",
    icon: "🤝",
    id: "partnership",
  },
  {
    title: "Join the team",
    description: "Join the Givny team.",
    icon: "👥",
    id: "join-team",
  },
  {
    title: "Other",
    description: "Talk to us.",
    icon: "📝",
    id: "other",
  },
];

export default function ContactForm() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">We&apos;d love to hear from you!<br />Send us a message.</h2>
        
        {/* Services - Cards on Desktop, Checkboxes on Mobile */}
        <div className="hidden md:grid grid-cols-4 gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`p-2 border rounded-lg cursor-pointer transition-all ${
                selectedServices.includes(service.id)
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{service.icon}</span>
                <h3 className="font-semibold text-sm text-nowrap truncate">{service.title}</h3>
              </div>
              <p className="text-xs text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile Checkboxes */}
        <div className="md:hidden space-y-2">
          {services.map((service) => (
            <label
              key={service.id}
              className="flex items-start gap-2 cursor-pointer"
            >
              <div 
                className={`w-4 h-4 rounded border flex items-center justify-center mt-1 ${
                  selectedServices.includes(service.id)
                    ? "bg-primary border-primary"
                    : "border-gray-300"
                }`}
                onClick={() => toggleService(service.id)}
              >
                {selectedServices.includes(service.id) && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{service.title}</p>
                <p className="text-xs text-gray-600">{service.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <form className="space-y-6">
        <CustomInput
            type="text"
            placeholder="Enter your name"
            label="Name"
            containerClassName="p-0"
        />
        <CustomInput
            type="email"
            placeholder="Enter your email"
            label="Email"
            containerClassName="p-0"
        />
        <CustomInput
            type="tel"
            placeholder="Enter your phone number"
            label="Phone Number"
            containerClassName="p-0"
        />
        <CustomTextarea
            label="Message"
            name="description"
            containerClassName="p-0"
        />
        <button 
          type="submit" 
          className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
} 