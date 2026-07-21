// Test appointment creation
const BASE_URL = 'http://localhost:3001';

async function testAppointment() {
  try {
    // First, let's check if we can get the current user
    console.log('\n=== Testing /api/me ===');
    const meResponse = await fetch(`${BASE_URL}/api/me`);
    console.log('Status:', meResponse.status);
    const meData = await meResponse.text();
    console.log('Response:', meData);

    // Get list of patients
    console.log('\n=== Getting patients ===');
    const patientsResponse = await fetch(`${BASE_URL}/api/patients`);
    console.log('Patients Status:', patientsResponse.status);
    if (!patientsResponse.ok) {
      console.log('Error:', await patientsResponse.text());
      return;
    }
    const patients = await patientsResponse.json();
    console.log('Patients found:', patients.length);
    if (patients.length === 0) {
      console.log('No patients found');
      return;
    }

    const patientId = patients[0].id;
    console.log('\n=== Testing appointment creation for patient', patientId, '===');

    // Test creating an appointment
    const appointmentPayload = {
      scheduledAt: new Date('2024-12-25T16:00:00').toISOString(),
      status: "SCHEDULED",
      type: "Regular",
      notes: "Test appointment"
    };

    console.log('Payload:', JSON.stringify(appointmentPayload, null, 2));

    const appointmentResponse = await fetch(`${BASE_URL}/api/patients/${patientId}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentPayload)
    });

    console.log('Appointment Status:', appointmentResponse.status);
    const appointmentData = await appointmentResponse.text();
    console.log('Response:', appointmentData);

  } catch (error) {
    console.error('Error:', error);
  }
}

testAppointment();
