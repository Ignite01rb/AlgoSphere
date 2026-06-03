import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DICEBEAR_STYLES = ["micah", "avataaars", "bottts", "notionists", "shapes", "pixel-art"];

const generateRandomAvatar = (style: string) => {
  const seed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
};

type AvatarPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export const AvatarPickerModal = ({ isOpen, onClose, onSelect }: AvatarPickerModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-card rounded-2xl border shadow-elevated p-6 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold tracking-tight">Choose an Avatar</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-8">
              {DICEBEAR_STYLES.map(style => (
                <div key={style} className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground capitalize">{style.replace('-', ' ')}</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const url = generateRandomAvatar(style);
                      return (
                        <button
                          key={i}
                          onClick={() => onSelect(url)}
                          className="aspect-square rounded-xl bg-secondary hover:bg-secondary/80 hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background transition-all overflow-hidden"
                        >
                          <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover p-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};