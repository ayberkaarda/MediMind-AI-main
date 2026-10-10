import type { ReactNode } from 'react';
import { Drawer } from '../../components/ui/Drawer';

export function RegionSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Bölgeye göre keşfet" placement="bottom">
      {children}
    </Drawer>
  );
}
