import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine

async def check():
    url = "postgresql+asyncpg://postgres.dnzjkdnhsgoijzewfxvq:suyash%40%4021%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        res = await conn.execute(
            text("select status, count(*) from contacts where campaign_id = '2be138c2-933a-4df4-8812-6e69ae667ac6' group by status")
        )
        for row in res:
            print(row)

from sqlalchemy import text
asyncio.run(check())
