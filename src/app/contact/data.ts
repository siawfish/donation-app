import { ContactServiceType } from "./types";

export const services = [
    {
      title: ContactServiceType.Support,
      description: "I need help with Givny.",
      icon: "🛠️",
      id: "support",
    },
    {
      title: ContactServiceType.Partnership,
      description: "Partner with Givny.",
      icon: "🤝",
      id: "partnership",
    },
    {
      title: ContactServiceType.JoinTeam,
      description: "Join the Givny team.",
      icon: "👥",
      id: "join-team",
    },
    {
      title: ContactServiceType.Other,
      description: "Talk to us.",
      icon: "📝",
      id: "other",
    },
  ];