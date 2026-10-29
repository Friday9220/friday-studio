// Forbindelse til databasen (Supabase). Udfyld efter guiden i SUPABASE.md.
// Den offentlige "anon"-nøgle må gerne stå her: databasen er låst, så den kun kan oprette bookinger.
window.FRIDAY_CONFIG = {
  supabaseUrl: 'https://ebbvozakceayxmrgigiv.supabase.co',
  supabaseAnonKey: 'sb_publishable_pDENvzPeWpDG1jyFyCRqKQ_r7sMbJZV',
  // Mail ved ny booking (via FormSubmit). Skriv jeres mail eller den kode, FormSubmit sender jer.
  notifyEmail: ''
};
