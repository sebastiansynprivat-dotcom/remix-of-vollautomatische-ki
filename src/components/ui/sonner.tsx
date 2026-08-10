import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Kompakte Premium-Toasts: flache Fläche, feine Border, farbiger Statusstreifen links. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      duration={3000}
      offset={16}
      toastOptions={{
        style: {
          background: "#18181D",
          border: "1px solid #2A2A30",
          borderRadius: 8,
          color: "#F4F4F5",
          fontSize: 13,
          padding: "10px 12px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
        },
        classNames: {
          toast: "group toast",
          description: "text-xs text-[#A1A1AA]",
          actionButton: "text-xs rounded-md px-3 py-1.5",
          cancelButton: "text-xs rounded-md px-3 py-1.5",
          success: "border-l-2 !border-l-emerald-500",
          warning: "border-l-2 !border-l-amber-500",
          error: "border-l-2 !border-l-red-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
