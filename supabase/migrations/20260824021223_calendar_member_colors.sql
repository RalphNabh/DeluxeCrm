-- Per-member calendar color, used to color-code job cards by assignee.
-- Nullable: members without a color yet get one assigned deterministically
-- (round-robin from a fixed palette) on read, so no backfill is needed.
alter table organization_members
  add column calendar_color text;
