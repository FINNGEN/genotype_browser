import re

class ParseException(Exception):
    pass

class NotFoundException(Exception):
    pass

def parse_chr(chr):
    chr = re.sub(r'^0', '', str(chr))
    return int(chr.lower().replace('chr', '').replace('x', '23'))

def parse_variant(variant):
    s = re.compile('-|_|:').split(variant)
    if len(s) != 4:
        raise ParseException()
    chr = parse_chr(s[0])
    try:
        pos = int(s[1])
    except ValueError:
        raise ParseException()
    return (chr, pos, s[2].upper(), s[3].upper())

def parse_region(region):
    s = re.compile('-|:').split(region)
    if len(s) != 3:
        raise ParseException()
    chr = parse_chr(s[0])
    try:
        start = int(s[1])
    except ValueError:
        raise ParseException()
    try:
        end = int(s[2])
    except ValueError:
        raise ParseException()
    return (chr, start, end)