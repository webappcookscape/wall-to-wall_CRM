import axios from 'axios';

async function testPublicWhatsAppEndpoint() {
  const crmUrl = 'http://localhost:5000/api/v1/leads/whatsapp';
  
  const mockPayload = {
    name: 'Aravind Kumar',
    mobile: '9876543210',
    city: 'Chennai',
    property_type: 'Apartment',
    project_type: 'New Home',
    bhk_size: '3 BHK',
    services_required: ['Modular Kitchen', 'Wardrobe', 'Full Home Interiors'],
    budget: '₹5 - ₹10 Lakhs',
    timeline: 'Within 1 Month',
    floor_plan: 'Yes',
    design_style: 'Modern',
    consultation_required: 'Yes',
    meeting_type: 'Phone Call',
    preferred_date_time: '20 June 2026 | 11:00 AM'
  };

  console.log('Testing public WhatsApp lead ingestion endpoint...');
  try {
    const res = await axios.post(crmUrl, mockPayload);
    console.log('✅ Response Code:', res.status);
    console.log('✅ Lead Created:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('❌ Endpoint test failed:', error.response ? error.response.data : error.message);
  }
}

testPublicWhatsAppEndpoint();
