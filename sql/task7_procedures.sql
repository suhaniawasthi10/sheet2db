-- =====================================================
-- task7_procedures.sql
-- Project: sheet2DB - Task 7: Public Dataset Optimizations
-- Purpose: Stored procedures for recurring operations
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_top_artists(INT);
DROP FUNCTION IF EXISTS get_customer_purchase_history(INT);
DROP FUNCTION IF EXISTS get_genre_report();
DROP FUNCTION IF EXISTS get_monthly_revenue_report(INT);
DROP FUNCTION IF EXISTS get_happiness_by_threshold(NUMERIC);
DROP FUNCTION IF EXISTS compare_countries(VARCHAR, VARCHAR);

-- =====================================================
-- PROCEDURE 1: Get Top Artists by Revenue
-- Returns top N artists with their sales metrics
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_artists(p_limit INT DEFAULT 10)
RETURNS TABLE(
    artist_id INT,
    artist_name VARCHAR,
    total_albums BIGINT,
    total_tracks BIGINT,
    total_revenue NUMERIC,
    avg_track_price NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a."ArtistId",
        a."Name"::VARCHAR,
        COUNT(DISTINCT al."AlbumId"),
        COUNT(DISTINCT t."TrackId"),
        COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0),
        ROUND(COALESCE(AVG(il."UnitPrice"), 0), 2)
    FROM "Artist" a
    LEFT JOIN "Album" al ON a."ArtistId" = al."ArtistId"
    LEFT JOIN "Track" t ON al."AlbumId" = t."AlbumId"
    LEFT JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
    GROUP BY a."ArtistId", a."Name"
    ORDER BY COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_top_artists IS 'Get top N artists by total revenue';

-- =====================================================
-- PROCEDURE 2: Get Customer Purchase History
-- Returns complete purchase history for a customer
-- =====================================================
CREATE OR REPLACE FUNCTION get_customer_purchase_history(p_customer_id INT)
RETURNS TABLE(
    invoice_id INT,
    invoice_date TIMESTAMP,
    track_name VARCHAR,
    artist_name VARCHAR,
    unit_price NUMERIC,
    quantity INT,
    line_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i."InvoiceId",
        i."InvoiceDate",
        t."Name"::VARCHAR,
        ar."Name"::VARCHAR,
        il."UnitPrice",
        il."Quantity",
        (il."UnitPrice" * il."Quantity")
    FROM "Invoice" i
    JOIN "InvoiceLine" il ON i."InvoiceId" = il."InvoiceId"
    JOIN "Track" t ON il."TrackId" = t."TrackId"
    JOIN "Album" al ON t."AlbumId" = al."AlbumId"
    JOIN "Artist" ar ON al."ArtistId" = ar."ArtistId"
    WHERE i."CustomerId" = p_customer_id
    ORDER BY i."InvoiceDate" DESC, i."InvoiceId", il."InvoiceLineId";
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_customer_purchase_history IS 'Get complete purchase history for a customer';

-- =====================================================
-- PROCEDURE 3: Get Genre Report
-- Returns comprehensive genre analytics
-- =====================================================
CREATE OR REPLACE FUNCTION get_genre_report()
RETURNS TABLE(
    genre_id INT,
    genre_name VARCHAR,
    track_count BIGINT,
    album_count BIGINT,
    total_sales BIGINT,
    total_revenue NUMERIC,
    avg_track_length_mins NUMERIC,
    revenue_per_track NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g."GenreId",
        g."Name"::VARCHAR,
        COUNT(DISTINCT t."TrackId"),
        COUNT(DISTINCT al."AlbumId"),
        COALESCE(SUM(il."Quantity"), 0)::BIGINT,
        COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0),
        ROUND(COALESCE(AVG(t."Milliseconds") / 60000.0, 0), 2),
        ROUND(
            COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0) / 
            NULLIF(COUNT(DISTINCT t."TrackId"), 0), 
            2
        )
    FROM "Genre" g
    LEFT JOIN "Track" t ON g."GenreId" = t."GenreId"
    LEFT JOIN "Album" al ON t."AlbumId" = al."AlbumId"
    LEFT JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
    GROUP BY g."GenreId", g."Name"
    ORDER BY COALESCE(SUM(il."UnitPrice" * il."Quantity"), 0) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_genre_report IS 'Get comprehensive genre analytics report';

-- =====================================================
-- PROCEDURE 4: Monthly Revenue Report
-- Returns revenue breakdown by month for a given year
-- =====================================================
CREATE OR REPLACE FUNCTION get_monthly_revenue_report(p_year INT)
RETURNS TABLE(
    month_num INT,
    month_name TEXT,
    order_count BIGINT,
    total_revenue NUMERIC,
    avg_order_value NUMERIC,
    unique_customers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(MONTH FROM i."InvoiceDate")::INT,
        TO_CHAR(i."InvoiceDate", 'Month'),
        COUNT(*),
        SUM(i."Total"),
        ROUND(AVG(i."Total"), 2),
        COUNT(DISTINCT i."CustomerId")
    FROM "Invoice" i
    WHERE EXTRACT(YEAR FROM i."InvoiceDate") = p_year
    GROUP BY EXTRACT(MONTH FROM i."InvoiceDate"), TO_CHAR(i."InvoiceDate", 'Month')
    ORDER BY EXTRACT(MONTH FROM i."InvoiceDate");
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_monthly_revenue_report IS 'Get monthly revenue breakdown for a year';

-- =====================================================
-- PROCEDURE 5: Get Countries by Happiness Threshold
-- Returns countries above a given happiness score
-- =====================================================
CREATE OR REPLACE FUNCTION get_happiness_by_threshold(p_min_score NUMERIC DEFAULT 5.0)
RETURNS TABLE(
    rank INT,
    country VARCHAR,
    happiness_score NUMERIC,
    gdp_per_capita NUMERIC,
    social_support NUMERIC,
    life_expectancy NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        overall_rank,
        country_or_region::VARCHAR,
        score,
        "2019".gdp_per_capita,
        "2019".social_support,
        healthy_life_expectancy
    FROM "2019"
    WHERE score >= p_min_score
    ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_happiness_by_threshold IS 'Get countries with happiness score above threshold';

-- =====================================================
-- PROCEDURE 6: Compare Two Countries
-- Returns side-by-side comparison of happiness metrics
-- =====================================================
CREATE OR REPLACE FUNCTION compare_countries(p_country1 VARCHAR, p_country2 VARCHAR)
RETURNS TABLE(
    metric TEXT,
    country1_value NUMERIC,
    country2_value NUMERIC,
    difference NUMERIC
) AS $$
DECLARE
    v_c1 RECORD;
    v_c2 RECORD;
BEGIN
    SELECT * INTO v_c1 FROM "2019" WHERE LOWER(country_or_region) = LOWER(p_country1);
    SELECT * INTO v_c2 FROM "2019" WHERE LOWER(country_or_region) = LOWER(p_country2);
    
    IF v_c1 IS NULL OR v_c2 IS NULL THEN
        RAISE EXCEPTION 'One or both countries not found';
    END IF;
    
    RETURN QUERY
    SELECT 'Happiness Score'::TEXT, v_c1.score, v_c2.score, v_c1.score - v_c2.score
    UNION ALL
    SELECT 'GDP Per Capita', v_c1.gdp_per_capita, v_c2.gdp_per_capita, v_c1.gdp_per_capita - v_c2.gdp_per_capita
    UNION ALL
    SELECT 'Social Support', v_c1.social_support, v_c2.social_support, v_c1.social_support - v_c2.social_support
    UNION ALL
    SELECT 'Life Expectancy', v_c1.healthy_life_expectancy, v_c2.healthy_life_expectancy, v_c1.healthy_life_expectancy - v_c2.healthy_life_expectancy
    UNION ALL
    SELECT 'Freedom', v_c1.freedom_to_make_life_choices, v_c2.freedom_to_make_life_choices, v_c1.freedom_to_make_life_choices - v_c2.freedom_to_make_life_choices
    UNION ALL
    SELECT 'Generosity', v_c1.generosity, v_c2.generosity, v_c1.generosity - v_c2.generosity
    UNION ALL
    SELECT 'Corruption Perception', v_c1.perceptions_of_corruption, v_c2.perceptions_of_corruption, v_c1.perceptions_of_corruption - v_c2.perceptions_of_corruption;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION compare_countries IS 'Compare happiness metrics between two countries';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Get top 5 artists
-- SELECT * FROM get_top_artists(5);

-- Example 2: Get customer purchase history
-- SELECT * FROM get_customer_purchase_history(1);

-- Example 3: Get genre report
-- SELECT * FROM get_genre_report();

-- Example 4: Get 2009 monthly revenue
-- SELECT * FROM get_monthly_revenue_report(2009);

-- Example 5: Get happy countries (score > 6.0)
-- SELECT * FROM get_happiness_by_threshold(6.0);

-- Example 6: Compare India vs Finland
-- SELECT * FROM compare_countries('India', 'Finland');

-- =====================================================
-- End of task7_procedures.sql
-- =====================================================
