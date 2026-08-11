$ BEGIN:
$ A1 = 0
$ LOOP:
$ A := 'F$SEARCH("*.MAC",A1)
$ IF A .EQS. "" THEN EXIT
$ B := [.OBJ]'F$PARSE(A,,,"NAME").OBJ
$ C := 'F$SEARCH(B)
$ IF C .nes. "" THEN goto got_obj
$ WRITE SYS$OUTPUT "No .OBJ for ''a'"
$ goto loop
$ got_obj:
$ MDAT := 'F$FILE(A,"CDT")
$ ODAT := 'F$FILE(C,"CDT")
$ IF f$cvt(ODAT) .LTS. f$cvt(MDAT) -
	 THEN WRITE SYS$OUTPUT "''a' needs re-assembly"
$ goto loop
