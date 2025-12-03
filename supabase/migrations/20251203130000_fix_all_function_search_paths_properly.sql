-- =====================================================
-- Fix all functions with empty search_path
-- =====================================================
-- The previous migration set search_path = '' which breaks everything
-- For SECURITY DEFINER functions, we need to set a proper search_path
-- This prevents search_path injection attacks while allowing functions to work

-- Admin functions
ALTER FUNCTION public.admin_delete_content_v2(p_content_type text, p_content_id bigint, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_delete_user_v2(p_user_id uuid, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_list_marketplace_listings(p_status text, p_query text, p_page integer, p_page_size integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_purge_user(p_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_suspend_user_v2(p_user_id uuid, p_is_suspended boolean, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_update_listing_status(p_listing_id bigint, p_status text, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_update_template_status(p_template_id bigint, p_status text, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.admin_update_user_role_v2(p_user_id uuid, p_is_admin boolean, p_reason text) SET search_path = 'public', 'extensions';

-- Bulk operations
ALTER FUNCTION public.bulk_delete_content(p_content_type text, p_content_ids bigint[], p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.bulk_suspend_users(p_user_ids uuid[], p_is_suspended boolean, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.bulk_update_report_status(p_report_ids bigint[], p_status text, p_admin_notes text) SET search_path = 'public', 'extensions';

-- Transaction functions
ALTER FUNCTION public.cancel_listing_transaction(p_transaction_id bigint, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.complete_listing_transaction(p_transaction_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_listing_transaction(p_listing_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.reserve_listing(p_listing_id bigint, p_buyer_id uuid, p_note text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.unreserve_listing(p_listing_id bigint) SET search_path = 'public', 'extensions';

-- Badge functions
ALTER FUNCTION public.check_and_award_first_purchase_badge() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_badge_progress(p_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_badges_with_details(p_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.sync_badge_code() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_collector_badge() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_completionist_badge() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_creator_badge() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_notify_badge_earned() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_reviewer_badge() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_top_rated_badge() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.trigger_trader_badge() SET search_path = 'public', 'extensions';

-- Report functions
ALTER FUNCTION public.check_entity_reported(p_target_type text, p_target_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.create_report(p_target_type text, p_target_id bigint, p_reason text, p_description text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.escalate_report(p_report_id bigint, p_priority_level integer, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_recent_reports(p_limit integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_report_statistics() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_reports(p_status text, p_target_type text, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_reports(p_status text, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_pending_reports(p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_report_status(p_report_id bigint, p_status text, p_admin_notes text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_report_status_v2(p_report_id bigint, p_status text, p_admin_notes text) SET search_path = 'public', 'extensions';

-- Template functions
ALTER FUNCTION public.copy_template(p_template_id bigint, p_custom_title text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.create_template(p_title text, p_description text, p_image_url text, p_is_public boolean) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.create_template(p_title text, p_description text, p_image_url text, p_is_public boolean, p_item_schema jsonb) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.delete_template(p_template_id bigint, p_reason text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.delete_template_copy(p_copy_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.delete_template_page(p_page_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.delete_template_slot(p_slot_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_my_template_copies_basic() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_template_progress(p_copy_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_template_rating_summary(p_template_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_template_ratings(p_template_id bigint, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_public_templates(p_limit integer, p_offset integer, p_search text, p_sort_by text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.publish_template(p_template_id bigint, p_is_public boolean) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.test_get_my_template_copies() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_template_metadata(p_template_id bigint, p_title text, p_description text, p_image_url text, p_is_public boolean) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_template_page(p_page_id bigint, p_title text, p_type text, p_page_number integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_template_progress(p_copy_id bigint, p_slot_id bigint, p_status text, p_count integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_template_slot(p_slot_id bigint, p_label text, p_is_special boolean) SET search_path = 'public', 'extensions';

-- Rating functions
ALTER FUNCTION public.check_mutual_ratings_and_notify() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.create_user_rating(p_rated_id uuid, p_rating integer, p_comment text, p_context_type text, p_context_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.delete_user_rating(p_rating_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_rating_summary(p_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_ratings(p_user_id uuid, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.notify_new_rating() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_user_rating(p_rating_id bigint, p_rating integer, p_comment text) SET search_path = 'public', 'extensions';

-- Listing/Marketplace functions
ALTER FUNCTION public.get_my_listings_with_progress(p_status text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_listings(p_user_id uuid, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_trade_listings(p_limit integer, p_offset integer, p_search text, p_viewer_postcode text, p_sort_by_distance boolean) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_trade_listings(p_limit integer, p_offset integer, p_search text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_trade_listings_filtered(p_limit integer, p_offset integer, p_search text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_trade_listings_filtered_with_distance(p_search text, p_viewer_postcode text, p_sort_by_distance boolean, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_trade_listings_with_collection_filter(p_limit integer, p_offset integer, p_search text, p_viewer_postcode text, p_sort_by_distance boolean, p_collection_ids bigint[]) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.mark_listing_sold_and_decrement(p_listing_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.publish_duplicate_to_marketplace(p_copy_id bigint, p_slot_id bigint, p_title text, p_description text, p_image_url text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_listing_status(p_listing_id bigint, p_new_status text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_trade_listing(p_listing_id bigint, p_title text, p_description text, p_sticker_number text, p_collection_name text, p_image_url text) SET search_path = 'public', 'extensions';

-- Trade/Proposal functions
ALTER FUNCTION public.find_mutual_traders(p_user_id uuid, p_collection_id integer, p_rarity text, p_team text, p_query text, p_min_overlap integer, p_lat double precision, p_lon double precision, p_radius_km double precision, p_sort text, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_trade_proposal_detail(p_proposal_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.list_trade_proposals(p_user_id uuid, p_box text, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.notify_new_proposal() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.notify_proposal_status_change() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.respond_to_trade_proposal(p_proposal_id bigint, p_action text) SET search_path = 'public', 'extensions';

-- User/Social functions
ALTER FUNCTION public.get_ignored_users(p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_ignored_users_count() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_collections(p_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_conversations() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.ignore_user(p_ignored_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.is_user_ignored(p_user_id uuid, p_target_user_id uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.search_users_admin(p_query text, p_status text, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.unignore_user(p_ignored_user_id uuid) SET search_path = 'public', 'extensions';

-- Favourite functions
ALTER FUNCTION public.get_favourite_count(p_target_type text, p_target_id text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_user_favourites(p_target_type text, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.is_favourited(p_target_type text, p_target_id text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.toggle_favourite(p_target_type text, p_target_id text) SET search_path = 'public', 'extensions';

-- Stats/Admin dashboard functions
ALTER FUNCTION public.get_admin_dashboard_stats() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_admin_performance_metrics(p_days_back integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_entity_moderation_history(p_entity_type text, p_entity_id bigint) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_moderation_activity(p_limit integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_moderation_audit_logs(p_moderation_action_type text, p_moderated_entity_type text, p_admin_id uuid, p_limit integer, p_offset integer) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_multiple_user_collection_stats(p_user_id uuid, p_collection_ids integer[]) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.log_admin_action() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.log_moderation_action(p_moderation_action_type text, p_moderated_entity_type text, p_moderated_entity_id bigint, p_moderation_reason text, p_old_values jsonb, p_new_values jsonb) SET search_path = 'public', 'extensions';

-- Utility/Helper functions
ALTER FUNCTION public.handle_updated_at() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.haversine_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public', 'extensions';
