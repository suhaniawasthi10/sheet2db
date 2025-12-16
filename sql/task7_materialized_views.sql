-- =====================================================
-- task7_materialized_views.sql
-- Project: sheet2DB - Task 7: Public Dataset Optimizations
-- Purpose: Materialized views for performance optimization
-- =====================================================

-- =====================================================
-- SECTION 1: Drop existing materialized views
-- =====================================================
DROP MATERIALIZED VIEW IF EXISTS mv_artist_sales_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_genre_popularity CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_customer_lifetime_value CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_happiness_regional_avg CASCADE;

-- =====================================================
-- MATERIALIZED VIEW 1: Artist Sales Summary
-- Pre-computed artist revenue metrics
-- =====================================================
CREATE MATERIALIZED VIEW mv_artist_sales_summary AS
SELECT 
    a."ArtistId",
    a."Name" AS artist_name,
    COUNT(DISTINCT al."AlbumId") AS total_albums,
    COUNT(DISTINCT t."TrackId") AS total_tracks,
    COALESCE(SUM(il."Quantity"), 0) AS total_units_sold,
    COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0) AS total_revenue,
    ROUND(COALESCE(AVG(il."UnitPrice"), 0), 2) AS avg_track_price
FROM "Artist" a
LEFT JOIN "Album" al ON a."ArtistId" = al."ArtistId"
LEFT JOIN "Track" t ON al."AlbumId" = t."AlbumId"
LEFT JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
GROUP BY a."ArtistId", a."Name"
WITH DATA;

-- Create index for faster lookups on materialized view
CREATE UNIQUE INDEX idx_mv_artist_sales_id ON mv_artist_sales_summary ("ArtistId");
CREATE INDEX idx_mv_artist_sales_revenue ON mv_artist_sales_summary (total_revenue DESC);

COMMENT ON MATERIALIZED VIEW mv_artist_sales_summary IS 
'Pre-computed artist sales metrics including albums, tracks, units sold, and revenue';

-- =====================================================
-- MATERIALIZED VIEW 2: Genre Popularity
-- Track count and revenue by genre
-- =====================================================
CREATE MATERIALIZED VIEW mv_genre_popularity AS
SELECT 
    g."GenreId",
    g."Name" AS genre_name,
    COUNT(DISTINCT t."TrackId") AS track_count,
    COUNT(DISTINCT al."AlbumId") AS album_count,
    COALESCE(SUM(il."Quantity"), 0) AS total_sales,
    COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0) AS total_revenue,
    ROUND(COALESCE(AVG(t."Milliseconds") / 60000.0, 0), 2) AS avg_track_minutes
FROM "Genre" g
LEFT JOIN "Track" t ON g."GenreId" = t."GenreId"
LEFT JOIN "Album" al ON t."AlbumId" = al."AlbumId"
LEFT JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
GROUP BY g."GenreId", g."Name"
WITH DATA;

CREATE UNIQUE INDEX idx_mv_genre_popularity_id ON mv_genre_popularity ("GenreId");
CREATE INDEX idx_mv_genre_popularity_sales ON mv_genre_popularity (total_sales DESC);

COMMENT ON MATERIALIZED VIEW mv_genre_popularity IS 
'Genre popularity metrics including track counts, album counts, and revenue';

-- =====================================================
-- MATERIALIZED VIEW 3: Customer Lifetime Value
-- Pre-computed customer value metrics
-- =====================================================
CREATE MATERIALIZED VIEW mv_customer_lifetime_value AS
SELECT 
    c."CustomerId",
    c."FirstName" || ' ' || c."LastName" AS customer_name,
    c."Email",
    c."Country",
    COUNT(DISTINCT i."InvoiceId") AS total_orders,
    COALESCE(SUM(i."Total"), 0) AS lifetime_value,
    COALESCE(AVG(i."Total"), 0) AS avg_order_value,
    MIN(i."InvoiceDate") AS first_purchase,
    MAX(i."InvoiceDate") AS last_purchase,
    CASE 
        WHEN SUM(i."Total") > 40 THEN 'High Value'
        WHEN SUM(i."Total") > 20 THEN 'Medium Value'
        ELSE 'Low Value'
    END AS customer_segment
FROM "Customer" c
LEFT JOIN "Invoice" i ON c."CustomerId" = i."CustomerId"
GROUP BY c."CustomerId", c."FirstName", c."LastName", c."Email", c."Country"
WITH DATA;

CREATE UNIQUE INDEX idx_mv_customer_ltv_id ON mv_customer_lifetime_value ("CustomerId");
CREATE INDEX idx_mv_customer_ltv_value ON mv_customer_lifetime_value (lifetime_value DESC);
CREATE INDEX idx_mv_customer_ltv_segment ON mv_customer_lifetime_value (customer_segment);

COMMENT ON MATERIALIZED VIEW mv_customer_lifetime_value IS 
'Customer lifetime value metrics with segmentation';

-- =====================================================
-- MATERIALIZED VIEW 4: Happiness Regional Averages
-- Pre-computed regional happiness metrics
-- =====================================================
-- Note: This requires the happiness_index data to be loaded first

-- =====================================================
-- REFRESH FUNCTIONS
-- =====================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_artist_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_genre_popularity;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_lifetime_value;
    RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to refresh artist sales view
CREATE OR REPLACE FUNCTION refresh_mv_artist_sales()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_artist_sales_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh genre popularity view
CREATE OR REPLACE FUNCTION refresh_mv_genre_popularity()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_genre_popularity;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh customer LTV view
CREATE OR REPLACE FUNCTION refresh_mv_customer_ltv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_lifetime_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_materialized_views IS 'Refresh all materialized views concurrently';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Top 10 artists by revenue
-- SELECT * FROM mv_artist_sales_summary ORDER BY total_revenue DESC LIMIT 10;

-- Example 2: Most popular genres
-- SELECT * FROM mv_genre_popularity ORDER BY total_sales DESC LIMIT 5;

-- Example 3: High value customers
-- SELECT * FROM mv_customer_lifetime_value WHERE customer_segment = 'High Value';

-- Example 4: Refresh all views
-- SELECT refresh_all_materialized_views();

-- =====================================================
-- End of task7_materialized_views.sql
-- =====================================================
