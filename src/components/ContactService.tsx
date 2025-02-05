import { services } from "@/app/contact/data";
import { Check } from "lucide-react";

interface ContactServiceProps {
    serviceId: string;
    onServiceChange: (serviceId: string) => void;
}

export default function ContactService({ serviceId, onServiceChange }: ContactServiceProps) {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">We&apos;d love to hear from you!<br />Send us a message.</h2>
            
            {/* Services - Cards on Desktop, Checkboxes on Mobile */}
            <div className="hidden md:grid grid-cols-4 gap-3">
            {services.map((service) => (
                <div
                key={service.id}
                onClick={() => onServiceChange(service.id)}
                className={`p-2 border rounded-lg cursor-pointer transition-all ${
                    serviceId.toLowerCase() === service.id.toLowerCase()
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
                    serviceId.toLowerCase() === service.id.toLowerCase()
                        ? "bg-primary border-primary"
                        : "border-gray-300"
                    }`}
                    onClick={() => onServiceChange(service.id)}
                >
                    {serviceId.toLowerCase() === service.id.toLowerCase() && (
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
    )
}