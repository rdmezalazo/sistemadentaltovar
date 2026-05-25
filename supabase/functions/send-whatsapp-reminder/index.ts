import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  patients: {
    full_name: string;
    phone: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointments } = await req.json() as { appointments: Appointment[] };

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No appointments provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const appointment of appointments) {
      try {
        const phone = appointment.patients.phone.replace(/\D/g, '');
        const formattedPhone = phone.startsWith('521') ? `+${phone}` : `+521${phone}`;
        
        const appointmentDate = new Date(appointment.appointment_date);
        const formattedDate = appointmentDate.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const message = `Hola ${appointment.patients.full_name}, te recordamos tu cita médica programada para el ${formattedDate}. Estado: ${appointment.status}. Por favor confirma tu asistencia.`;

        const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: `whatsapp:${twilioWhatsAppNumber}`,
              To: `whatsapp:${formattedPhone}`,
              Body: message,
            }),
          }
        );

        if (response.ok) {
          successful++;
          results.push({
            appointmentId: appointment.id,
            phone: formattedPhone,
            success: true,
          });
          console.log(`Message sent successfully to ${appointment.patients.full_name}`);
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          const errorMessage = errorData.message || errorData.code || 'Error desconocido';
          failed++;
          results.push({
            appointmentId: appointment.id,
            phone: formattedPhone,
            success: false,
            error: errorMessage,
          });
          console.error(`Failed to send message to ${appointment.patients.full_name}:`, JSON.stringify(errorData));
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          appointmentId: appointment.id,
          success: false,
          error: errorMessage,
        });
        console.error(`Error processing appointment ${appointment.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        successful,
        failed,
        total: appointments.length,
        results,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in send-whatsapp-reminder function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
