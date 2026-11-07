-- Store a safe Lucide icon identifier for each category; existing rows retain Package.
alter table public.categories
  add column icon text not null default 'Package'
  check (icon in (
    'LayoutGrid', 'Package', 'ShoppingBag', 'Leaf', 'Shirt', 'Coffee',
    'LampDesk', 'Heart', 'Truck', 'CreditCard', 'Headphones', 'ClipboardList'
  ));
