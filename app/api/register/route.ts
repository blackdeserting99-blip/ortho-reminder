} catch (error) {
  console.error("===== REGISTER FAILED =====");

  console.error("constructor:", error?.constructor?.name);

  if (error instanceof Error) {
    console.error("name:", error.name);
    console.error("message:", error.message);
    console.error("stack:", error.stack);
  } else {
    console.error("raw:", JSON.stringify(error));
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Register failed",
      debug:
        error instanceof Error
          ? error.message
          : String(error),
    },
    { status: 500 }
  );
}