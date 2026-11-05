-- One-time cleanup of the eight original demo rows only.
-- Does not touch owner-added products, member accounts, orders, or payment settings.
-- Match ID + original SKU + original bundled image to avoid deleting edited rows.
delete from public.products as p
using (values
 ('a1000000-0000-4000-8000-000000000001'::uuid,'ZM-BAG-001','/images/bag.svg'),
 ('a1000000-0000-4000-8000-000000000002'::uuid,'ZM-LIF-001','/images/bottle.svg'),
 ('a1000000-0000-4000-8000-000000000003'::uuid,'ZM-TEC-001','/images/headphones.svg'),
 ('a1000000-0000-4000-8000-000000000004'::uuid,'ZM-HOM-001','/images/lamp.svg'),
 ('a1000000-0000-4000-8000-000000000005'::uuid,'ZM-LIF-002','/images/cup.svg'),
 ('a1000000-0000-4000-8000-000000000006'::uuid,'ZM-FAS-002','/images/shirt.svg'),
 ('a1000000-0000-4000-8000-000000000007'::uuid,'ZM-HOM-002','/images/vase.svg'),
 ('a1000000-0000-4000-8000-000000000008'::uuid,'ZM-TEC-002','/images/speaker.svg')
) as demo(id,sku,image_url)
where p.id=demo.id and p.sku=demo.sku and p.image_url=demo.image_url;
