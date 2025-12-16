-- =====================================================
-- task7_optimizations.sql
-- Project: sheet2DB - Task 7: Public Dataset Optimizations
-- Purpose: Strategic indexes and query optimization
-- =====================================================

-- =====================================================
-- SECTION 1: Strategic Indexes for Chinook Database
-- =====================================================

-- Index for customer lookups by email (common query pattern)
CREATE INDEX IF NOT EXISTS idx_customer_email ON "Customer"("Email");

-- Index for customer country filtering (analytics queries)
CREATE INDEX IF NOT EXISTS idx_customer_country ON "Customer"("Country");

-- Index for invoice date range queries
CREATE INDEX IF NOT EXISTS idx_invoice_date ON "Invoice"("InvoiceDate");

-- Index for invoice customer lookups
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON "Invoice"("CustomerId");

-- Composite index for invoice with date and customer (common join pattern)
CREATE INDEX IF NOT EXISTS idx_invoice_customer_date ON "Invoice"("CustomerId", "InvoiceDate");

-- Index for track lookups by album
CREATE INDEX IF NOT EXISTS idx_track_album ON "Track"("AlbumId");

-- Index for track lookups by genre
CREATE INDEX IF NOT EXISTS idx_track_genre ON "Track"("GenreId");

-- Index for track composer searches
CREATE INDEX IF NOT EXISTS idx_track_composer ON "Track"("Composer") WHERE "Composer" IS NOT NULL;

-- Index for album artist lookups
CREATE INDEX IF NOT EXISTS idx_album_artist ON "Album"("ArtistId");

-- Index for invoice line track lookups
CREATE INDEX IF NOT EXISTS idx_invoiceline_track ON "InvoiceLine"("TrackId");

-- Index for invoice line invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoiceline_invoice ON "InvoiceLine"("InvoiceId");

-- =====================================================
-- SECTION 2: Indexes for World Happiness Data
-- =====================================================

-- Index for happiness score queries
CREATE INDEX IF NOT EXISTS idx_happiness_score ON "2019"(score DESC);

-- Index for GDP per capita queries
CREATE INDEX IF NOT EXISTS idx_happiness_gdp ON "2019"(gdp_per_capita DESC);

-- Index for country lookups
CREATE INDEX IF NOT EXISTS idx_happiness_country ON "2019"(country_or_region);

-- =====================================================
-- SECTION 3: Benchmark Query Collection
-- =====================================================

-- -----------------------------------------------------
-- BENCHMARK 1: Complex JOIN - Artist Revenue Report
-- Expected: Use indexes on Album, Track, InvoiceLine
-- -----------------------------------------------------
-- BEFORE INDEXES
EXPLAIN ANALYZE
SELECT 
    a."Name" AS artist_name,
    COUNT(DISTINCT al."AlbumId") AS albums,
    SUM(il."Quantity" * il."UnitPrice") AS revenue
FROM "Artist" a
JOIN "Album" al ON a."ArtistId" = al."ArtistId"
JOIN "Track" t ON al."AlbumId" = t."AlbumId"
JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
GROUP BY a."ArtistId", a."Name"
ORDER BY revenue DESC
LIMIT 10;

-- -----------------------------------------------------
-- BENCHMARK 2: Time-Range Query - Monthly Sales
-- Expected: Use idx_invoice_date
-- -----------------------------------------------------
EXPLAIN ANALYZE
SELECT 
    DATE_TRUNC('month', "InvoiceDate") AS month,
    COUNT(*) AS order_count,
    SUM("Total") AS total_revenue
FROM "Invoice"
WHERE "InvoiceDate" BETWEEN '2009-01-01' AND '2009-12-31'
GROUP BY DATE_TRUNC('month', "InvoiceDate")
ORDER BY month;

-- -----------------------------------------------------
-- BENCHMARK 3: Customer Analysis by Country
-- Expected: Use idx_customer_country
-- -----------------------------------------------------
EXPLAIN ANALYZE
SELECT 
    c."Country",
    COUNT(DISTINCT c."CustomerId") AS customer_count,
    SUM(i."Total") AS total_revenue,
    AVG(i."Total") AS avg_order_value
FROM "Customer" c
JOIN "Invoice" i ON c."CustomerId" = i."CustomerId"
GROUP BY c."Country"
ORDER BY total_revenue DESC;

-- -----------------------------------------------------
-- BENCHMARK 4: Genre Performance Analysis
-- Expected: Use idx_track_genre
-- -----------------------------------------------------
EXPLAIN ANALYZE
SELECT 
    g."Name" AS genre,
    COUNT(t."TrackId") AS tracks,
    COUNT(DISTINCT al."AlbumId") AS albums,
    SUM(il."Quantity") AS units_sold
FROM "Genre" g
JOIN "Track" t ON g."GenreId" = t."GenreId"
JOIN "Album" al ON t."AlbumId" = al."AlbumId"
LEFT JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
GROUP BY g."GenreId", g."Name"
ORDER BY units_sold DESC NULLS LAST;

-- -----------------------------------------------------
-- BENCHMARK 5: Happiness vs Materialized View
-- Compare direct query vs materialized view
-- -----------------------------------------------------
EXPLAIN ANALYZE
SELECT 
    a."Name" AS artist_name,
    COUNT(DISTINCT al."AlbumId") AS total_albums,
    COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0) AS total_revenue
FROM "Artist" a
LEFT JOIN "Album" al ON a."ArtistId" = al."ArtistId"
LEFT JOIN "Track" t ON al."AlbumId" = t."AlbumId"
LEFT JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
GROUP BY a."ArtistId", a."Name"
ORDER BY total_revenue DESC
LIMIT 10;

-- vs Materialized View (run after loading views)
-- EXPLAIN ANALYZE SELECT * FROM mv_artist_sales_summary ORDER BY total_revenue DESC LIMIT 10;

-- =====================================================
-- SECTION 4: Database Statistics
-- =====================================================

-- Get index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Get table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.' || quote_ident(tablename))) AS total_size,
    pg_size_pretty(pg_relation_size('public.' || quote_ident(tablename))) AS table_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || quote_ident(tablename)) DESC;

-- =====================================================
-- End of task7_optimizations.sql
-- =====================================================
