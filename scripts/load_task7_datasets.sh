#!/bin/bash

# =====================================================
# Task 7: Load Public Datasets via psql
# =====================================================
# This script loads the Chinook and Happiness datasets
# using psql, which supports COPY FROM stdin commands.
#
# Usage: ./scripts/load_task7_datasets.sh
# =====================================================

set -e

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  TASK 7: LOADING PUBLIC DATASETS"
echo "═══════════════════════════════════════════════════════"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    exit 1
fi

echo "📌 Using database: ${DATABASE_URL:0:50}..."
echo ""

# Load Chinook dataset
echo "═══════════════════════════════════════════════════════"
echo "  PHASE 1: LOADING CHINOOK DATABASE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "ℹ️  Loading Chinook (artists, albums, tracks, invoices)..."
psql "$DATABASE_URL" -f data/task7/chinook.sql 2>&1 | tail -5
echo "✅ Chinook database loaded"
echo ""

# Load Happiness dataset
echo "═══════════════════════════════════════════════════════"
echo "  PHASE 2: LOADING HAPPINESS INDEX"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "ℹ️  Loading World Happiness Index (156 countries)..."
psql "$DATABASE_URL" -f data/task7/happiness_index.sql 2>&1 | tail -5
echo "✅ Happiness Index loaded"
echo ""

# Load optimizations
echo "═══════════════════════════════════════════════════════"
echo "  PHASE 3: APPLYING OPTIMIZATIONS"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "ℹ️  Creating stored procedures..."
psql "$DATABASE_URL" -f sql/task7_procedures.sql 2>&1 | tail -3
echo "✅ Stored procedures created"
echo ""

echo "ℹ️  Creating materialized views..."
psql "$DATABASE_URL" -f sql/task7_materialized_views.sql 2>&1 | tail -3
echo "✅ Materialized views created"
echo ""

# Verify data
echo "═══════════════════════════════════════════════════════"
echo "  PHASE 4: VERIFYING DATA"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📊 Record counts:"
psql "$DATABASE_URL" -c "
SELECT 'Artists' as table_name, COUNT(*) as count FROM \"Artist\"
UNION ALL SELECT 'Albums', COUNT(*) FROM \"Album\"
UNION ALL SELECT 'Tracks', COUNT(*) FROM \"Track\"
UNION ALL SELECT 'Customers', COUNT(*) FROM \"Customer\"
UNION ALL SELECT 'Invoices', COUNT(*) FROM \"Invoice\"
UNION ALL SELECT 'Invoice Lines', COUNT(*) FROM \"InvoiceLine\"
UNION ALL SELECT 'Genres', COUNT(*) FROM \"Genre\"
UNION ALL SELECT 'Happiness 2019', COUNT(*) FROM \"2019\"
ORDER BY table_name;
"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ ALL DATASETS LOADED SUCCESSFULLY"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Run benchmarks: npm run task7:etl (will skip loading)"
echo "  2. Test incremental: npm run task7:incremental"
echo "  3. Query materialized views:"
echo "     SELECT * FROM mv_artist_sales_summary LIMIT 5;"
echo "     SELECT * FROM mv_genre_popularity LIMIT 5;"
echo ""
