const pool = require('../database/connection');

const setTenantContext = async (client, { clubId, organizationId } = {}) => {
  if (organizationId) {
    await client.query('set local app.current_clerk_org_id = $1', [organizationId]);
  }
  if (clubId) {
    await client.query('set local app.current_club_id = $1', [clubId]);
  }
};

const withTenantClient = async (tenant, callback) => {
  const client = await pool.connect();
  try {
    await setTenantContext(client, tenant);
    return await callback(client);
  } finally {
    client.release();
  }
};

const getClubByOrganizationId = async organizationId => {
  if (!organizationId) {
    return null;
  }
  const { rows } = await pool.query(
    `select id, name, subdomain, logo_url, color, stripe_customer_id, b2_prefix, status
     from clubs
     where clerk_org_id = $1
     limit 1`,
    [organizationId]
  );
  return rows[0] || null;
};

module.exports = {
  setTenantContext,
  withTenantClient,
  getClubByOrganizationId
};
